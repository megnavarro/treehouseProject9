'use strict';

const express = require('express');
const { sequelize, User, Course } = require('./models');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

// Construct a router instance
const router = express.Router();

// async handler
function asyncHandler(cb){
    return async (req,res, next) => {
        try {
            await cb(req, res, next);
        } catch(err) {
            next(err);
        }
    }
}

// User authentication function
const authenticateUser = async (req, res, next) => {
    let message = null;

    const credentials = auth(req);
    
    if(credentials) {        
        const user = await User.findOne({ where: {emailAddress: credentials.name } });
        console.log(credentials.pass);
        console.log(user.password);
        if(user) {
            const authenticated = bcryptjs
                .compareSync(credentials.pass, user.password);

                if(authenticated) {
                    req.currentUser = user;
                } else {
                    message = `Authentication failure for email: ${user.emailAddress}`;
                }
        } else {
            message = `User not found for: ${credentials.name}`;
        }
    } else {
        message = 'Authorization header not found';
    }

    if (message) {
        console.warn(message);
        res.status(401).json({message: 'Access Denied'});
    } else {
        next();
    }
};

// User Routes

// Route that returns the currently authenticated user
router.get('/users', authenticateUser, asyncHandler(async (req, res) => {
    const user = req.currentUser;

    res
        .status(200)
        .json({
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress,
    });
}));

// Route that creates a user, sets the Location header to '/', and returns no content
router.post('/users', (req, res) => {
    res.status(201).set('Location', '/').end();
});

module.exports = router;