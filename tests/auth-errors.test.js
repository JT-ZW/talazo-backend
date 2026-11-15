import {test} from 'node:test';import assert from 'node:assert/strict';
import {passwordError} from '../src/lib/auth-errors.mjs';
test('an already-saved password is a completed operation',()=>{
 const result=passwordError({code:'same_password'});assert.equal(result.alreadySaved,true);assert.match(result.message,/already saved/);
});
test('password policy and stale sessions have actionable messages',()=>{
 assert.match(passwordError({code:'weak_password',reasons:['pwned']}).message,/breaches/);
 assert.match(passwordError({code:'reauthentication_needed'}).message,/Sign in again/);
 assert.match(passwordError({status:429}).message,/wait/);
 assert.equal(passwordError({code:'unknown'}).alreadySaved,false);
});
