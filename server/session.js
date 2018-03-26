const redis = require('redis');
const session = require('express-session');
const redisStore = require('connect-redis')(session);
const config = require('./config');
let redisClient;

//create redis client
function createRedisClient(){
    let redisConfig = config.getSessionConfig().redisConfig;
    redisClient = redis.createClient({host : redisConfig.host, port : redisConfig.port});
    //redisClient = redis.createClient();
    //Redis connection checking functions
    redisClient.on('connect',function() {
     console.log("Connected to Redis...");
    });
 
    redisClient.on('ready',function() {
     console.log("Redis is ready");
    });

    redisClient.on('error',function(err) {
        console.log("Error in Redis:"+err);
    });

    return redisClient;
 }
 
 //get Redis client
 function getRedisClient(){
     //return redisClient ? redisClient : createRedisClient();
     if(redisClient){
         return redisClient;
     }else{
         return createRedisClient();
     }
 }

//create application session store
function createSession(sessionConfig){
   let redisClient = getRedisClient();
   let sessionStore = session({
                        secret: sessionConfig.sessionSecret,
                        store: new redisStore({ host: sessionConfig.redisConfig.host, 
                                                port: sessionConfig.redisConfig.port, 
                                                client: redisClient}),
                        resave: false,
                        saveUninitialized: false
                      });
   return sessionStore;
}

module.exports = {
    createSession: createSession,
    getRedisClient: getRedisClient
}