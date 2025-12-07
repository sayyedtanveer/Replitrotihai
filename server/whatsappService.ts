import axios from "axios";

// WhatsApp API Configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  text?: {
    preview_url: boolean;
    body: string;
  };
}

export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  // If WhatsApp credentials are not configured, log a warning but don't fail
  if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn("⚠️ WhatsApp service not configured. Skipping WhatsApp message to:", phoneNumber);
    return false;
  }

  try {
    const payload: WhatsAppMessage = {
      messaging_product: "whatsapp",
      to: phoneNumber.replace(/[^0-9]/g, ""), // Remove non-numeric characters
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    };

    const response = await axios.post(
      `${WHATSAPP_API_URL}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ WhatsApp message sent to ${phoneNumber}:`, response.data?.messages?.[0]?.id);
    return true;
  } catch (error) {
    console.error(`❌ WhatsApp send failed for ${phoneNumber}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

export async function sendScheduledDeliveryReminder(
  recipientName: string,
  recipientPhone: string,
  orderNumber: string,
  deliveryTime: string,
  deliveryDate: string,
  customerName: string,
  items: string[]
): Promise<boolean> {
  const [hours, mins] = deliveryTime.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const timeString = `${displayHours}:${String(mins).padStart(2, "0")} ${period}`;

  const itemsList = items.join(", ");

  const message = `
🚀 *Scheduled Delivery Reminder* 🚀

Hi ${recipientName},

You have a scheduled delivery order coming up!

📋 *Order Details:*
• Order #: ${orderNumber}
• Customer: ${customerName}
• Items: ${itemsList}
• Delivery Time: ${timeString}
• Delivery Date: ${deliveryDate}

⏰ Please prepare accordingly!

-RotiHai Team
  `.trim();

  return sendWhatsAppMessage(recipientPhone, message);
}
