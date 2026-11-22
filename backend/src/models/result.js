// Database access for the results table: one item per student per quiz (key: quizId + userId).
// The rules "one attempt", "no saving after the deadline" and "graded once" are enforced here
// with DynamoDB condition expressions, so two requests at the same moment cannot break them.
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLES } from '../config/aws.js';

const isConditionFailure = (err) => err.name === 'ConditionalCheckFailedException';

// Returns the attempt, or undefined if the student has not started this quiz.
export async function get(quizId, userId) {
  const { Item } = await db.send(new GetCommand({ TableName: TABLES.results, Key: { quizId, userId } }));
  return Item;
}

// Returns false if the student already has an attempt (e.g. Start clicked twice).
export async function create(attempt) {
  try {
    await db.send(new PutCommand({
      TableName: TABLES.results,
      Item: attempt,
      ConditionExpression: 'attribute_not_exists(userId)',
    }));
    return true;
  } catch (err) {
    if (isConditionFailure(err)) return false;
    throw err;
  }
}

// A student's attempts, from the byUser index. The index has no answers (see 03-data-model.md).
export async function listByUser(userId) {
  const { Items } = await db.send(new QueryCommand({
    TableName: TABLES.results,
    IndexName: 'byUser',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  }));
  return Items;
}

// All attempts on a quiz, for the admin results page.
export async function listByQuiz(quizId) {
  // ponytail: one page (1 MB) holds ~200 attempts; paginate for bigger classes.
  const { Items } = await db.send(new QueryCommand({
    TableName: TABLES.results,
    KeyConditionExpression: 'quizId = :quizId',
    ExpressionAttributeValues: { ':quizId': quizId },
  }));
  return Items;
}

// Saves one answer (optionIndex null clears it). Returns false if the attempt is
// missing, already submitted, or its deadline is before `cutoff`.
export async function saveAnswer(quizId, userId, questionId, optionIndex, cutoff) {
  const clearing = optionIndex === null;
  try {
    await db.send(new UpdateCommand({
      TableName: TABLES.results,
      Key: { quizId, userId },
      UpdateExpression: clearing ? 'REMOVE answers.#q' : 'SET answers.#q = :option',
      ConditionExpression: '#status = :inProgress AND deadline > :cutoff',
      ExpressionAttributeNames: { '#q': questionId, '#status': 'status' },
      ExpressionAttributeValues: {
        ':inProgress': 'IN_PROGRESS',
        ':cutoff': cutoff,
        ...(clearing ? {} : { ':option': optionIndex }),
      },
    }));
    return true;
  } catch (err) {
    if (isConditionFailure(err)) return false;
    throw err;
  }
}

// Stores the final answers and score. Returns the updated attempt,
// or null if it was already submitted (another request got there first).
export async function markSubmitted(attempt, answers, scores, autoSubmitted) {
  try {
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLES.results,
      Key: { quizId: attempt.quizId, userId: attempt.userId },
      UpdateExpression: 'SET #status = :submitted, answers = :answers, autoSubmitted = :auto, submittedAt = :now, '
        + 'score = :score, totalMarks = :totalMarks, correctCount = :correctCount, questionCount = :questionCount',
      ConditionExpression: '#status = :inProgress',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':submitted': 'SUBMITTED',
        ':inProgress': 'IN_PROGRESS',
        ':answers': answers,
        ':auto': autoSubmitted,
        ':now': new Date().toISOString(),
        ':score': scores.score,
        ':totalMarks': scores.totalMarks,
        ':correctCount': scores.correctCount,
        ':questionCount': scores.questionCount,
      },
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes;
  } catch (err) {
    if (isConditionFailure(err)) return null;
    throw err;
  }
}
