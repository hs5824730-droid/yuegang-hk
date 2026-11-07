import test from 'node:test';
import assert from 'node:assert/strict';
import {viewingStatus} from '../src/viewing-status';
test('availability needs explicit source evidence; absent/unknown values never mean leased',()=>{
 for(const availabilityStatus of [undefined,null,'unknown','rented','expired','',false,0])assert.equal(viewingStatus({kind:'rent',availabilityStatus}),'unknown');
 assert.equal(viewingStatus({kind:'rent',availabilityStatus:'available'}),'available');assert.equal(viewingStatus({kind:'rent',availabilityStatus:'leased'}),'leased');
 for(const availabilityStatus of [undefined,'available','leased'])assert.equal(viewingStatus({kind:'sold',availabilityStatus}),'sold');
 assert.equal(viewingStatus({kind:'sale',availabilityStatus:'available'}),'sale');
});
