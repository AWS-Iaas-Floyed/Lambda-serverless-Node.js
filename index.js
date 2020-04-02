const aws = require("aws-sdk");
var ddb = new aws.DynamoDB({ apiVersion: '2012-08-10' });
var rdsdb = new aws.RDS();
var ses = new aws.SES();
aws.config.update({ region: "us-east-1" });
var docClient = new aws.DynamoDB.DocumentClient();


exports.billDueService = function (event, context, callback) {

    console.log(event.Records[0].Sns);

    let message = event.Records[0].Sns.Message;
    let messageDataJson = JSON.parse(JSON.parse(message).data);

    let email = messageDataJson.Email;
    let link = messageDataJson.link;

    link = link.replace('undefined', 'prod.floyed-pinto.me');

    console.log("Email for :: " + email);
    console.log("Link to send :: " + link);

    let currentTime = new Date().getTime();
    let ttl = 15 * 60 * 1000;
    let expirationTime = (currentTime + ttl).toString();

    var emailParams = {
        Destination: {
            ToAddresses: [
                email
            ]
        },
        Message: {
            Body: {
                Text: {
                    Charset: "UTF-8",
                    Data: link
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: "Bills due"
            }
        },
        Source: "floyedpinto08@" + process.env.DOMAIN_NAME
    };
    let putParams = {
        TableName: "emailrequest",
        Item: {
            id: { S: email },
            ttl: { N: expirationTime }
        }
    };
    let queryParams = {
        TableName: 'emailrequest',
        Key: {
            'id': { S: email }
        },
    };


    ddb.getItem(queryParams, (err, data) => {

        console.log("Data ::" + JSON.stringify(data));

        if (err) {
            console.log(err);
        } else {

            console.log(data.Item);

            let jsonData = JSON.stringify(data);
            console.log(jsonData);

            let parsedJson = JSON.parse(jsonData);
            console.log(parsedJson);
            if (data.Item == undefined) {

                ddb.putItem(putParams, (err, data) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(data);

                        console.log('Email sent for first time!');

                        ses.sendEmail(emailParams)
                            .then(function (data) {
                                console.log(data.MessageId);
                            })
                            .catch(function (err) {
                                console.error(err, err.stack);
                            });
                    }
                });
            } else {
                let curr = new Date().getTime();

                let ttl = Number(parsedJson.Item.ttl.N);

                console.log(typeof curr + ' ' + curr);
                console.log(typeof ttl + ' ' + ttl);

                if (curr > ttl) {

                    ddb.putItem(putParams, (err, data) => {

                        console.log("Data putitem::" + data);

                        if (err) {
                            console.log(err);
                        } else {

                            console.log(data);
                            console.log('Updating last sent timestamp');

                            ses.sendEmail(emailParams)
                                .then(function (data) {
                                    console.log(data.MessageId);
                                })
                                .catch(function (err) {
                                    console.error(err, err.stack);
                                });
                        }
                    });
                } else {
                    console.log('Email already sent in the last 60 mins for user ::'+email);
                }
            }
        }
    });
};