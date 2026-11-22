// Database access for the quizzes table.
import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLES } from '../config/aws.js';
import { HttpError } from '../utils/HttpError.js';

// Returns the quiz, or throws 404 if it does not exist.
export async function get(quizId) {
  const { Item } = await db.send(new GetCommand({ TableName: TABLES.quizzes, Key: { quizId } }));
  if (!Item) throw new HttpError(404, 'NOT_FOUND', 'Quiz not found');
  return Item;
}

export async function list() {
  // ponytail: Scan reads the whole table. Fine for tens of quizzes; add a status index if it reaches thousands.
  const { Items } = await db.send(new ScanCommand({ TableName: TABLES.quizzes }));
  return Items;
}

// Creates or replaces the whole quiz item.
export async function save(quiz) {
  await db.send(new PutCommand({ TableName: TABLES.quizzes, Item: quiz }));
}

export async function remove(quizId) {
  await db.send(new DeleteCommand({ TableName: TABLES.quizzes, Key: { quizId } }));
}
