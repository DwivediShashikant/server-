const express = require('express');
const router = express.Router();
const proxy = require('express-request-proxy');
const config = require('../config');

const common = require('../common');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


//common function to make http request
function makeHttpRequest(req,reqPath,sessionInfo,res, next,queryString){
    console.log('**Making an HttpRequest');
    common.prepareCommonApiManagerRequest({request:req,sessionInfo:sessionInfo,identifier:'api'})
   .then((response) => {
       console.log('**Response URL',response.apiUrl);
       console.log('**Reqest Path',reqPath);
      proxy({
              url: response.apiUrl+reqPath,
              timeout: 120000
          })(response.request, res, next);
   }).catch((error) => {
       res.status(500).send(error);
   });
}

// Dashboard Services
router.get('/summaryreport', function(req, res, next) {
    makeHttpRequest(req,'summaryreport',req.user,res, next);
});

router.get('/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'summaryreport/hospital/:id',req.user,res, next);
});


router.get('/summaryreport/allnotes', function(req, res, next) {
    makeHttpRequest(req,'summaryreport/allnotes',req.user,res, next);
});

router.get('/summaryreport/allbeds/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'summaryreport/allbeds/hospital/:id',req.user,res, next);
});

// Patients Services
router.post('/patient', function(req, res, next) {
    makeHttpRequest(req,'patient',req.user,res, next);
});

router.put('/patient/:id', function(req, res, next) {
    makeHttpRequest(req,'patient/:id',req.user,res, next);
});

router.get('/patient/all', function(req, res, next) {
    makeHttpRequest(req,'summaryreport/allpatients',req.user,res, next);
});

router.get('/patient/all/hospital/:id', function(req, res, next) {
    console.log('********Req type',req.method);
    makeHttpRequest(req,'patient/all/hospital/:id',req.user,res, next);
});

router.get('/patient/:id', function(req, res, next) {
    makeHttpRequest(req,'patient/:id',req.user,res, next);
});

router.delete('/patient/:id', function(req, res, next) {
    makeHttpRequest(req,'patient/:id',req.user,res, next);
});

// Hospitals Services
router.post('/hospital', function(req, res, next) {
    makeHttpRequest(req,'hospital',req.user,res, next);
});

router.put('/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'hospital/:id',req.user,res, next);
});

router.get('/hospital/all', function(req, res, next) {
    makeHttpRequest(req,'hospital/all',req.user,res, next);
});

router.get('/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'hospital/:id',req.user,res, next);
});

router.delete('/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'hospital/:id',req.user,res, next);
});

// Departments Services
router.get('/dept/all', function(req, res, next) {
    makeHttpRequest(req,'dept/all',req.user,res, next);
});

router.get('/dept/all/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'dept/all/hospital/:id',req.user,res, next);
});

router.get('/dept/:id', function(req, res, next) {
    makeHttpRequest(req,'dept/:id',req.user,res, next);
});

router.post('/dept', function(req, res, next) {
    makeHttpRequest(req,'dept',req.user,res, next);
});

router.put('/dept/:id', function(req, res, next) {
    makeHttpRequest(req,'dept/:id',req.user,res, next);
});

router.delete('/dept/:id', function(req, res, next) {
    makeHttpRequest(req,'dept/:id',req.user,res, next);
});

// Beds Services
router.post('/bed', function(req, res, next) {
    makeHttpRequest(req,'bed',req.user,res, next);
});

router.put('/bed/:id', function(req, res, next) {
    makeHttpRequest(req,'bed/:id',req.user,res, next);
});

router.get('/bed/all', function(req, res, next) {
    makeHttpRequest(req,'bed/all',req.user,res, next);
});

router.get('/bed/:id', function(req, res, next) {
    makeHttpRequest(req,'bed/:id',req.user,res, next);
});

router.get('/bed/all/icu/:id', function(req, res, next) {
    makeHttpRequest(req,'bed/all/icu/:id',req.user,res, next);
});

router.get('/bed/all/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'bed/all/hospital/:id',req.user,res, next);
});

router.delete('/bed/:id', function(req, res, next) {
    makeHttpRequest(req,'bed/:id',req.user,res, next);
});

// Camera Services
router.post('/camera', function(req, res, next) {
    makeHttpRequest(req,'camera',req.user,res, next);
});

router.put('/camera/:id', function(req, res, next) {
    makeHttpRequest(req,'camera/:id',req.user,res, next);
});

router.get('/camera/all', function(req, res, next) {
    makeHttpRequest(req,'camera/all',req.user,res, next);
});

router.get('/camera/all/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'camera/all/hospital/:id',req.user,res, next);
});

router.get('/camera/all/icu/:id', function(req, res, next) {
    makeHttpRequest(req,'camera/all/icu/:id',req.user,res, next);
});

router.get('/camera/:id', function(req, res, next) {
    makeHttpRequest(req,'/camera/:id',req.user,res, next);
});
router.delete('/camera/:id', function(req, res, next) {
    makeHttpRequest(req,'camera/:id',req.user,res, next);
});

// User
router.post('/user', function(req, res, next) {
   makeHttpRequest(req,'user',req.user,res, next);
});

router.put('/user/:id', function(req, res, next) {
   makeHttpRequest(req,'user/:id',req.user,res, next);
});

router.get('/user/:id', function(req, res, next) {
    // makeHttpRequest(req,'user/'+req.params.id,req.user,res, next);
     makeHttpRequest(req,'user/:id',req.user,res, next);
});

router.get('/user/all', function(req, res, next) {
    makeHttpRequest(req,'user/all',req.user,res, next);
});

router.get('/user/all/hospital/:id', function(req, res, next) {
    makeHttpRequest(req,'user/all/hospital/:id',req.user,res, next);
});

router.delete('/user/:id', function(req, res, next) {
   makeHttpRequest(req,'user/:id',req.user,res, next);
});

//Tenant Services
router.get('/tenant/:tenantName', function(req, res, next) {
    common.prepareCommonApiManagerRequest({request:req,sessionInfo:req.user,identifier:'api'})
    .then((response)=>{
        response.request.headers["x-tennantid"] = "coheremed";
        proxy({
        url: response.apiUrl+'tenant',
        query: {
          tenantname: response.request.params.tenantName
        },
        timeout: 120000
        })(response.request, res, next);
    })
    .catch((error)=>{
        res.status(500).send(error);
    })
});

//Meeting Service
router.post('/meeting/create', function(req, res, next) {
    common.prepareCommonApiManagerRequest({request:req,sessionInfo:req.user,identifier:'meeting'})
    .then((response)=>{
        proxy({
            url: response.apiUrl+'meeting',
            timeout: 120000
        })(response.request, res, next);
    })
    .catch((error)=>{
        res.status(500).send(error);
    })
});

module.exports = router;
