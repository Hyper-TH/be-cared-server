import cron from 'node-cron';
import express from 'express';

const router = express.Router();

// TODO: Caching/Refreshing
// Note that medicines.ie has a flag for any updates within 30 days!

// TODO: Refetch every week for all PDF documents
// cron.schedule(" */2 * * * * *", () => {
//     console.log("A cron job that runs every 2 seconds");
// });

// cron.schedule(" * */2 * * * *", () => {
//     console.log("A cron job that runs every 2 minutes");
// });

// const job = cron.schedule(
//     " * */40 * * * *",
//     () => {
//       console.log("A cron job that runs every 40 minutes");
//       console.log("This job will start in 20 minutes");
//     },
//     {
//       scheduled: false,
//       timezone: "Europe/London",
//     }
// );

// this will start the job in 20 minutes
// setTimeout(() => {
//     job.start();
// }, 1000 * 60 * 20);


/* START BLOCK THAT RUNS EVERY FRIDAY */
// Define your method to run every Friday
function myScheduledMethod() {
    console.log("Running scheduled method: It's Friday 2:00 PM in London!");
}

const job = cron.schedule('0 0 14 * * 5', myScheduledMethod, null, true, 'Europe/London');

// Start the job
job.start();
/* END BLOCK THAT RUNS EVERY FRIDAY */

export default router;