const express = require('express');
const { body } = require('express-validator');


const app = require('express')();
app.use(express.json());

app.post('/api/auth/register', [])
app.post('/api/auth/login', [])
app.get('/api/auth/me', [])