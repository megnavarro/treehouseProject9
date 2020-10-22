'use strict';

const express = require('express');
const { check, validationResult } = require('express-validator');
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

/* 
// User Routes
*/


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
router.post('/users', [
    check('firstName')
        .exists()
        .withMessage('Please provide a value for "First Name"'),
    check('lastName')
        .exists()
        .withMessage('Please provide a value for "Last Name"'),
    check('emailAddress')
        .exists()
        .withMessage('Please provide a value for "Email Address"'),
    check('password')
        .exists()
        .withMessage('Please provide a value for "Password"'),
], asyncHandler(async (req, res) => {
    // captures any validation errors
    const errors = validationResult(req);

    // Try creates new user, Catch displays validation errors (if occur)
    let user;
    try {
        user = await req.body;
        // Hash the new user's password
        user.password = bcryptjs.hashSync(user.password);

        await User.create(user);

        res.status(201).set('Location', '/').end();
    } catch (error) {
        if(!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg);
            return res.status(400).json({ errors: errorMessages });
        } else {
            throw error;
        }
    }
}));


/* 
// Course Routes
*/

// Route that returns a list of courses including User Owner
router.get('/courses', asyncHandler(async (req, res) => {
    const courses = await Course.findAll({
        include: [{
            model: User,
            as: 'User', 
            attributes: {
                exclude: ["password", "createdAt", "updatedAt"]
            }
        }]
    });
    res
        .status(200)
        .json(courses);
}));

// Route that returns a specific course using course ID
router.get('/courses/:id', asyncHandler(async(req, res) => {
    const course = await Course.findByPk(req.params.id, {
        include: [{
            model: User,
            as: 'User', 
            attributes: {
                exclude: ["password", "createdAt", "updatedAt"]
            }
        }]
    });
    if(course) {
        res.json(course).status(200);
    } else {
        res.status(404).json( {message: "Course not found"});
    }
}));

// Route that creates course, sets Location header to URI for course, and returns 201 Created
router.post('/courses', authenticateUser, [
    check('title')
        .isLength({min: 2})
        .withMessage('Please provide a value for "Title"'),
    check('description')
        .isLength({min: 2})
        .withMessage('Please provide a value for "Description"'),
], asyncHandler(async (req, res) => {
    // captures any validation errors
    const errors = validationResult(req);

    // Try creates new course, Catch displays validation errors (if occur)
    let course;
    try {
          course = await Course.create(req.body);

        res.status(201).set('Location', `/api/courses/${course.id}`).end();
    } catch (error) {
        if(!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg);
            return res.status(400).json({ errors: errorMessages });
        } else {
            throw error;
        }
    }
}));

// Route that updates a course and returns no content
router.put('/courses/:id', authenticateUser, [
    check('title')
        .isLength({min: 2})
        .withMessage('Please provide a value for "Title"'),
    check('description')
        .isLength({min: 2})
        .withMessage('Please provide a value for "Description"'),
], asyncHandler(async(req, res) => {
    // captures any validation errors
    const errors = validationResult(req);
    console.log(errors);

    let course;
    try {
        course = await Course.findByPk(req.params.id);
        if(course) {
            await course.update(req.body);
            res.status(204).end();
        } else {
            const error = new Error('Sorry, there is no course with that ID. Please try again.');
            error.status = 404;
            throw error;
        }
    } catch (error) {
        if(!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg);
            return res.status(400).json({ errors: errorMessages });
        } else {
            throw error;
        }
    }
}));

router.delete('/courses/:id', authenticateUser, asyncHandler(async(req, res) => {
    const course = await Course.findByPk(req.params.id);
    if(course) {
        await course.destroy(req.body);
        res.status(204).end();
    } else {
        const error = new Error('Sorry, there is no course with that ID. Please try again.');
        error.status = 404;
        throw error;
    }
}));


module.exports = router;

