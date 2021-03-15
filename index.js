const { conversation } = require('@assistant/conversation');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Defines app
const app = conversation({
    debug: true,
    clientId: `<CLIENT-ID-TO-BE-ADD-BY-YOU>.apps.googleusercontent.com`,
});

// Adds Firebase
admin.initializeApp({ databaseURL: 'https://<YOUR-DATABASE-URL>.firebaseio.com/' });

const db = admin.database();
const ref = db.ref('myActivities');

// Logs an activity
app.handle('activity', (conv) => {
    // Generates an Id https://gist.github.com/gordonbrander/2230317
    let randomIdGenerator = '_' + Math.random().toString(36).substr(2, 9);
    let userId = conv.user.verification === 'VERIFIED' ? conv.user.storage : randomIdGenerator;

    ref.child('new_activity' + randomIdGenerator).set({
        date: Date.now(),
        userId: userId,
        type: conv.intent.query,
    });
    conv.add('Activity logged.');
});

// Shows quantity of activity per type
app.handle('activityReport', (conv) => {
    let hashMap = {};
    let result = {};

    // Loops through all nodes and shows the quantity by type, there is no group_by / order by in the real time database
    return ref
        .orderByChild('type')
        .once('value')
        .then((snapshot) => {
            snapshot.forEach(function (data) {
                // if that type exists
                if (data.val().type in hashMap) {
                    // up the prev count
                    hashMap[data.val().type] = hashMap[data.val().type] + 1;
                } else {
                    hashMap[data.val().type] = 1;
                }
            });
            // Iterates through those keys of the hashmap and formats it for the output array
            let outputArray = [];
            Object.keys(hashMap).forEach((key) => {
                outputArray.push({
                    key,
                    count: hashMap[key],
                });
            });
            result = outputArray.map(({ key, count }) => `${key}: ${count}\n`).join('');
            conv.add(`Logged activities: ${String(result)}`);
        });
});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
