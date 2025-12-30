MFA & Secret Rotation — Instructions

Follow these steps after creating `ci-admin` and ensuring you can sign in to the AWS Console.

1) Enable Virtual MFA for `Admin` and `ci-admin` (Console)
   - Sign in to the AWS Console as `Admin`.
   - Go to IAM → Users → Admin → Security credentials → Assigned MFA device → Manage.
   - Choose "Virtual MFA device" and scan the QR code with an authenticator app (Google Authenticator, Authy).
   - Repeat for `ci-admin`.

2) Delete exposed access key (run locally with valid admin CLI creds)
   - Use `scripts/remove_exposed_key.sh`:

```bash
AWS_PROFILE=ci-admin ./scripts/remove_exposed_key.sh
```

3) Create new access key for `ci-admin` and store securely
   - In Console: IAM → Users → ci-admin → Security credentials → Create access key.
   - Copy the new `Access key ID` and `Secret access key` to a secure vault (1Password, AWS Secrets Manager, etc.).

4) Update GitHub Actions secrets
   - Install GitHub CLI and authenticate: `gh auth login`
   - Export new creds in env vars and run the helper script:

```bash
export NEW_AWS_ACCESS_KEY_ID=AKIA....
export NEW_AWS_SECRET_ACCESS_KEY=...secret...
GITHUB_REPO=amanrax/Phase1 ./scripts/rotate_github_secrets.sh
```

5) Confirm CI uses least-privilege credentials
   - Replace AdministratorAccess with a narrower IAM policy for CI deployments (ECR push, ECS deploy, S3 upload).

6) Audit and revoke any other keys that were generated during the incident.

If you want, I can generate a least-privilege policy JSON for CI to push to ECR and deploy to ECS.
