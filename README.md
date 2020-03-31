# Email sending AWS Lambda function

The file index.js contains the code that will be deployed on AWS Lambda

## Install npm packages

```
npm i` or `npm install
```

## To run the Lambda function

Zip the file index.js and run the following command

```
aws lambda update-function-code --function-name BillDueService --region us-east-1 --zip-file fileb://lambda.zip
```