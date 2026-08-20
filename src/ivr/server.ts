import "dotenv/config";
import express from "express";
import { YemotRouter } from "yemot-router2";
import { handleBookingCall } from "@/ivr/booking-flow";

const app = express();

const router = YemotRouter({
  printLog: true,
  defaults: {
    removeInvalidChars: true,
  },
  uncaughtErrorHandler: (error, call) => {
    console.error(`[ivr] uncaught error for call ${call.callId} from ${call.phone}:`, error);
    return call.id_list_message([
      { type: "text", data: "אירעה שגיאה במערכת, אנא נסו שוב מאוחר יותר. תודה ולהתראות" },
    ]);
  },
});

router.events.on("new_call", (call) => {
  console.log(`[ivr] new call ${call.callId} from ${call.phone}`);
});
router.events.on("call_hangup", (call) => {
  console.log(`[ivr] call ${call.callId} hung up`);
});

const secret = process.env.IVR_SHARED_SECRET;
if (!secret) {
  throw new Error(
    "IVR_SHARED_SECRET לא מוגדר ב-.env. יש להגדיר מחרוזת סודית אקראית כדי שרק ימות המשיח יוכל לקרוא לנתיב הזה."
  );
}
const bookingPath = `/booking-${secret}`;

router.get(bookingPath, handleBookingCall);

app.use(express.urlencoded({ extended: true }));
app.use(router.asExpressRouter);

const port = Number(process.env.IVR_PORT) || 3001;
app.listen(port, () => {
  console.log(`[ivr] Yemot IVR server listening on port ${port}`);
  console.log(`[ivr] api_link לשלוחה: http://<your-domain>:${port}${bookingPath}`);
});
