#!/usr/bin/env bash
# Creates a faculty (admin) account. Only people with AWS access can run this,
# which is why nobody can make themselves an admin from the website.
#
# Usage: ./scripts/create-admin.sh <email> "<Full Name>"
# Cognito emails the user a temporary password; they choose a new one at first login.
set -euo pipefail

# Cognito user pool of the quiz-portal stack (SAM output "UserPoolId").
# If the stack is ever deleted and deployed again, update this ID.
POOL_ID="ap-south-1_wUiZWCl1R"

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <email> \"<Full Name>\""
  exit 1
fi

EMAIL="$1"
NAME="$2"

aws cognito-idp admin-create-user \
  --user-pool-id "$POOL_ID" \
  --username "$EMAIL" \
  --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true Name=name,Value="$NAME" \
  --desired-delivery-mediums EMAIL > /dev/null

aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$POOL_ID" \
  --username "$EMAIL" \
  --group-name Admin

echo "Created admin $EMAIL. Cognito has emailed them a temporary password."
