// AWS clients and resource names.
// Lambda keeps these between requests, so they are created once, not per request.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

// The Document client lets us read and write plain JavaScript objects
// instead of DynamoDB's typed format ({ S: 'text' }, { N: '5' }).
export const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const s3 = new S3Client({});

// Names are set as environment variables in template.yaml.
export const TABLES = {
  quizzes: process.env.QUIZZES_TABLE,
  questions: process.env.QUESTIONS_TABLE,
  results: process.env.RESULTS_TABLE,
};

export const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
