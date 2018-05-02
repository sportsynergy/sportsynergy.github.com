var https = require('https');
var querystring = require('querystring');
var AWS = require("aws-sdk");
var url = require('url');

exports.handler = function (event, context, callback) {
    
    // print out the event
    console.log(JSON.stringify(event));
    
    // Validate the recaptcha
    var dummy = "http://www.example.com/?" // this is not pretty
    var url_parts = url.parse(dummy+event.body, true);
    var input_data = url_parts.query;
    var postData = querystring.stringify({
        'secret': process.env.ReCaptchaSecret,
        'response': input_data['g-recaptcha-response']
    });
    

    var message = "";
    Object.keys(input_data).forEach(function(key) {
       message += key+':\n';
       message += '\t'+input_data[key]+'\n\n';
    });
    
    console.log(JSON.stringify(message));
   
    var options = {
        hostname: 'www.google.com',
        port: 443,
        path: '/recaptcha/api/siteverify',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    var req = https.request(options, function(res) {
        
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            var captchaResponse = JSON.parse(chunk);
            if (captchaResponse.success) {
                var sns = new AWS.SNS();
                delete input_data['g-recaptcha-response'];
                var message = "";
                Object.keys(input_data).forEach(function(key) {
                   message += key+':\n';
                   message += '\t'+input_data[key]+'\n\n';
                });
                
                var params = {
                    Message: message,
                    Subject: process.env.Subject,
                    TopicArn: process.env.ContactUsSNSTopic
                };
                
                sns.publish(params, function (err, response) {
                    
                    if (err) {
                        console.log('Error sending a message', err);
                    } else {
                        
                        console.log("publishing to topic.." + JSON.stringify(params));
                   
                        callback(null, {
                            statusCode: '200',
                            headers: {
                                "Access-Control-Allow-Methods" : "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                                "Access-Control-Allow-Headers" : "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                                "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                                "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
                            },
                            
                            body: JSON.stringify(response)
                        });
                    
                }
                });
            } else {
                callback(null, {
                    statusCode: '500',
                    headers: {
                        "Access-Control-Allow-Methods" : "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                        "Access-Control-Allow-Headers" : "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                        "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                        "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
                    },
                    body: JSON.stringify({message:'Invalid recaptcha'})
                });
            }
        });
    });

    req.on('error', function(e) {
        callback(null, {
            statusCode: '500',
            headers: {
                "Access-Control-Allow-Methods" : "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Headers" : "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify({message:e.message})
        });
    });

    // write data to request body
    req.write(postData);
    req.end();
};
