// Pre-signed S3 URLs: temporary links that let the browser read or upload one image
// directly to the private media bucket, without making the bucket public.
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, MEDIA_BUCKET } from '../config/aws.js';

export async function getImageUrl(imageKey) {
  if (!imageKey) return undefined;
  // ponytail: the link can stop working before 3 h if Lambda's credentials rotate; refreshing the page gets a new one.
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: imageKey }), { expiresIn: 3 * 60 * 60 });
}

export function getUploadUrl(imageKey, contentType) {
  // ponytail: the 2 MB limit is checked in the browser only. Uploads are admin-only;
  // switch to a pre-signed POST with content-length-range if students ever upload.
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: imageKey, ContentType: contentType }), { expiresIn: 5 * 60 });
}

// Adds imageUrl to each question that has an image.
export function withImageUrls(questions) {
  return Promise.all(questions.map(async (question) => ({ ...question, imageUrl: await getImageUrl(question.imageKey) })));
}
