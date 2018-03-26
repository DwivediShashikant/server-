const express = require('express');
const userService = express.Router();
const bodyParser = require('body-parser');
const http = require('request-promise');
const userManager = require('../presence/user');
const config = require('../config');

userService.use(bodyParser.json());
userService.use(bodyParser.urlencoded({ extended: false }));

userService.post('/', function(req, res, next) {
    userManager.createUser(req.body,req).then((response) => {
            if(response.status){
                res.status(500);
                res.send({
                    status:500,
                    statusText: response.statusText
                });
            }else{
               res.send(response);
            }
            
        }).catch((error) => {
            res.status(500);
            res.send({
                status:500,
                statusText: error
            });
        });
});

userService.put('/', function(req, res, next) {
    userManager.updateUser(req.body,req).then((response) => {
            res.send("Updated user sucessfully");
        }).catch((error) => {
            res.status(500);
            res.send({
                status:500,
                statusText: error
            });
        });
});

userService.delete('/:id/:userName/:fhirUserId', function(req, res, next) {
    userManager.deleteUser(req.params.id,req.params.userName,req.params.fhirUserId,req).then((response) => {   
            res.send("Deleted user sucessfully");
        }).catch((error) => {
            res.status(500);
            res.send({
                status:500,
                statusText: error
            });
        });
});



module.exports = userService;
