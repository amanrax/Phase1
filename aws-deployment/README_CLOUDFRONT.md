CloudFront fronting for API (no domain purchase)
===============================================

Purpose
-------
This CloudFormation template creates a CloudFront distribution that uses your existing ALB as origin. CloudFront provides a valid HTTPS hostname (dxxxxx.cloudfront.net) so mobile WebView and apps can access your API without buying a custom domain.

Quick steps
-----------
1. Ensure you have AWS CLI configured with permissions to create CloudFront and CloudFormation stacks.
2. Deploy the CloudFormation stack:

```bash
cd aws-deployment
./deploy-cloudfront.sh cem-cloudfront <your-alb-dns>
```

3. After deployment, get the CloudFront domain:

```bash
aws cloudformation describe-stacks --stack-name cem-cloudfront --query 'Stacks[0].Outputs' --output table
```

4. Update your mobile app config (`frontend/.env.production`) to use the CloudFront domain as `VITE_API_BASE_URL`, e.g.: 

```
VITE_API_BASE_URL=https://d123abc.cloudfront.net
VITE_API_PROD_URL=https://d123abc.cloudfront.net
```

5. Rebuild the mobile APK (CI or locally) so the app uses the new HTTPS endpoint. Then install and test on device.

Notes
-----
- CloudFront will communicate with your ALB over HTTP (origin protocol policy `http-only`) so ALB can keep its current listener configuration.
- If your ALB is in a private subnet, ensure CloudFront can reach it (use an internet-facing ALB for this setup).
- For production-grade setup consider adding cache behaviours, custom error pages, and stricter forwarded headers.
