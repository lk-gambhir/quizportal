// Database access for the questions table (key: quizId + questionId).
import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLES } from '../config/aws.js';
import { HttpError } from '../utils/HttpError.js';

// All questions of a quiz, in the order they were added.
export async function listByQuiz(quizId) {
  // ponytail: reads one page (1 MB), far more than 100 questions need; paginate if the limit grows.
  const { Items } = await db.send(new QueryCommand({
    TableName: TABLES.questions,
    KeyConditionExpression: 'quizId = :quizId',
    ExpressionAttributeValues: { ':quizId': quizId },
  }));
  return Items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Returns the question, or throws 404 if it does not exist.
export async function get(quizId, questionId) {
  const { Item } = await db.send(new GetCommand({ TableName: TABLES.questions, Key: { quizId, questionId } }));
  if (!Item) throw new HttpError(404, 'NOT_FOUND', 'Question not found');
  return Item;
}

export async function save(question) {
  await db.send(new PutCommand({ TableName: TABLES.questions, Item: question }));
}

export async function remove(quizId, questionId) {
  try {
    await db.send(new DeleteCommand({
      TableName: TABLES.questions,
      Key: { quizId, questionId },
      ConditionExpression: 'attribute_exists(questionId)',
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') throw new HttpError(404, 'NOT_FOUND', 'Question not found');
    throw err;
  }
}
