import {test} from 'node:test';import assert from 'node:assert/strict';
import {monitoringConfirmed} from '../src/lib/server/monitoring-confirmation.mjs';
test('only positive monitoring confirmations permit local capacity changes',()=>{
 for(const value of ['Paused','Field monitoring paused successfully.','Monitoring has been successfully paused'])assert(monitoringConfirmed(value,'paused'));
 for(const value of ['Could not pause monitoring','Unable to pause','Monitoring was not paused','Already paused?','Pause requested',{},null])assert.equal(monitoringConfirmed(value,'paused'),false);
 assert(monitoringConfirmed('Field monitoring resumed successfully','resumed'));
 assert.equal(monitoringConfirmed('paused','resumed'),false);
});
