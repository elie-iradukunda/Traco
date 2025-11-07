import { pool } from "../db.js";

const ROLE_CONTEXT_CONFIG = {
  admin: {
    general: {
      message:
        "🔐 Admin tip: You can manage routes, drivers, vehicles, and monitor KPIs from the admin dashboard. Jump into `/admin/dashboard` or head to `/admin/live-tracking` for fleet visibility.",
      suggestions: [
        "Open admin dashboard",
        "Show live tracking",
        "How do I manage drivers?",
      ],
    },
    routes: {
      message:
        "🗺️ Admin insight: Use the Manage Routes page to adjust schedules, assign vehicles, and notify drivers instantly.",
      suggestions: [
        "Open Manage Routes",
        "Assign a driver to a route",
      ],
    },
    booking: {
      message:
        "🎫 Admin reminder: Review and resend tickets from the All Tickets page if passengers need help.",
      suggestions: [
        "View all tickets",
        "How to refund a ticket?",
      ],
    },
    payments: {
      message:
        "💳 Admin note: Reconcile MTN Mobile Money transactions from Revenue Analytics to keep finance aligned.",
      suggestions: ["Open Revenue Analytics"],
    },
    loyalty: {
      message:
        "⭐ Admin heads-up: Adjust reward tiers or manually credit points from the loyalty tools if necessary.",
      suggestions: ["View loyalty dashboard"],
    },
    tracking: {
      message:
        "📡 Admin shortcut: Monitor every vehicle in real time from `/admin/live-tracking` and filter by route to spot delays fast.",
      suggestions: ["Show live tracking", "How to notify a driver?"],
    },
    support: {
      message:
        "🤝 Admin workflow: Log passenger issues in the admin portal so operations can follow up promptly.",
      suggestions: ["Log a passenger issue"],
    },
  },
  driver: {
    general: {
      message:
        "🚘 Driver tip: Open your Driver Dashboard for assignments and enable auto GPS tracking once you start a journey.",
      suggestions: [
        "Open driver dashboard",
        "How do I start a journey?",
      ],
    },
    routes: {
      message:
        "🛣️ Driver reminder: Check the Journey tab to confirm your route details and passenger list before departure.",
      suggestions: ["Show my assignments", "View passenger list"],
    },
    booking: {
      message:
        "🎫 Driver note: Use the QR scanner in your dashboard to validate tickets and confirm boarding.",
      suggestions: ["How to scan a ticket?"],
    },
    payments: {
      message:
        "💵 Driver info: Confirm passengers have a completed MTN Mobile Money payment before boarding when in doubt.",
      suggestions: ["How to verify payment?"],
    },
    loyalty: {
      message:
        "⭐ Driver reminder: Mention loyalty rewards—every validated trip boosts passenger points.",
      suggestions: ["Explain loyalty to passenger"],
    },
    tracking: {
      message:
        "📡 Driver checklist: Start automatic GPS tracking from the Journey tab so dispatch and passengers can follow your bus.",
      suggestions: ["How do I enable GPS?"],
    },
    support: {
      message:
        "🆘 Driver support: Contact dispatch via the hotline or in-app tools if you run into issues on route.",
      suggestions: ["Call dispatch"],
    },
  },
  passenger: {
    general: {
      message:
        "🧭 Passenger tip: Visit `My Tickets` to track your vehicle live, access QR codes, and manage bookings in one place.",
      suggestions: [
        "Open My Tickets",
        "How do I track my vehicle?",
      ],
    },
    routes: {
      message:
        "🚌 Passenger hint: After finding a route you like, tap Book Ticket to secure your seat and pay with MTN Mobile Money.",
      suggestions: ["Book a ticket", "See vehicle availability"],
    },
    booking: {
      message:
        "🎫 Passenger reminder: Your QR code lives in My Tickets—show it to the driver when boarding.",
      suggestions: ["View my tickets", "Payment methods"],
    },
    payments: {
      message:
        "💳 Passenger info: Pay securely with MTN Mobile Money and earn loyalty points for every journey.",
      suggestions: ["Check my loyalty points"],
    },
    loyalty: {
      message:
        "⭐ Passenger perk: Track and redeem loyalty points from your dashboard; higher tiers unlock more rewards.",
      suggestions: ["How to redeem points?"],
    },
    tracking: {
      message:
        "📍 Passenger hint: Use the Track Vehicle button on active tickets to view the live map and ETA.",
      suggestions: ["Track my vehicle"],
    },
    support: {
      message:
        "☎️ Passenger help: If you need assistance, use the support contacts listed in the app or ask me here.",
      suggestions: ["Contact support"],
    },
  },
};

const appendUniqueSuggestions = (base = [], extras = []) => {
  const existing = new Set(base.map((item) => item.toLowerCase()));
  extras.forEach((item) => {
    if (!existing.has(item.toLowerCase())) {
      base.push(item);
      existing.add(item.toLowerCase());
    }
  });
  return base;
};

const applyRoleContext = (role, topic, response, suggestions) => {
  if (!role) {
    return { response, suggestions };
  }

  const roleConfig = ROLE_CONTEXT_CONFIG[role];
  if (!roleConfig) {
    return { response, suggestions };
  }

  const context = roleConfig[topic] || roleConfig.general;
  if (!context) {
    return { response, suggestions };
  }

  const enhancedResponse = `${response}

${context.message}`;
  const enhancedSuggestions = appendUniqueSuggestions([...(suggestions || [])], context.suggestions || []);

  return {
    response: enhancedResponse,
    suggestions: enhancedSuggestions,
  };
};

// AI Chatbot that understands platform-specific queries
export const chatWithBot = async (req, res) => {
  try {
    const { message, user_id, user_role } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const userMessage = message.toLowerCase().trim();
    let response = "";
    let suggestions = [];
    let contextTopic = "general";

    // Route Information Queries
    if (userMessage.includes("route") || userMessage.includes("bus") || userMessage.includes("schedule")) {
      contextTopic = "routes";
      if (userMessage.includes("list") || userMessage.includes("show") || userMessage.includes("all")) {
        const routes = await pool.query(`
          SELECT route_name, start_location, end_location, fare_base, expected_start_time
          FROM routes
          ORDER BY route_name ASC
          LIMIT 10
        `);
        
        if (routes.rows.length > 0) {
          response = "Here are the available routes:\n\n";
          routes.rows.forEach((route, index) => {
            response += `${index + 1}. ${route.route_name}\n`;
            response += `   From: ${route.start_location} → To: ${route.end_location}\n`;
            response += `   Fare: ${route.fare_base || 'N/A'} RWF\n`;
            if (route.expected_start_time) {
              response += `   Time: ${route.expected_start_time}\n`;
            }
            response += "\n";
          });
          suggestions = ["How do I book a ticket?", "What are the payment methods?", "Show me more routes"];
        } else {
          response = "I couldn't find any routes at the moment. Please check back later or contact support.";
        }
      } else if (userMessage.includes("from") && userMessage.includes("to")) {
        // Extract locations from message
        const fromMatch = userMessage.match(/from\s+([a-z\s]+?)(?:\s+to|\s*$)/i);
        const toMatch = userMessage.match(/to\s+([a-z\s]+?)(?:\s|$)/i);
        
        if (fromMatch && toMatch) {
          const fromLoc = fromMatch[1].trim();
          const toLoc = toMatch[1].trim();
          
          const routes = await pool.query(`
            SELECT route_name, start_location, end_location, fare_base, route_id
            FROM routes
            WHERE LOWER(start_location) LIKE $1 AND LOWER(end_location) LIKE $2
            LIMIT 5
          `, [`%${fromLoc}%`, `%${toLoc}%`]);
          
          if (routes.rows.length > 0) {
            response = `I found ${routes.rows.length} route(s) from ${fromLoc} to ${toLoc}:\n\n`;
            routes.rows.forEach((route, index) => {
              response += `${index + 1}. ${route.route_name}\n`;
              response += `   Fare: ${route.fare_base || 'N/A'} RWF\n\n`;
            });
            suggestions = [`Book ticket for ${routes.rows[0].route_name}`, "Show payment methods", "What is the schedule?"];
          } else {
            response = `I couldn't find a direct route from ${fromLoc} to ${toLoc}. Would you like to see all available routes?`;
            suggestions = ["Show all routes", "Contact support"];
          }
        } else {
          response = "I can help you find routes! Try asking: 'Show routes from [location] to [location]' or 'List all routes'";
          suggestions = ["Show all routes", "How to book a ticket?"];
        }
      } else {
        response = "I can help you with routes! You can ask me:\n• 'Show all routes'\n• 'Routes from [location] to [location]'\n• 'What routes are available?'";
        suggestions = ["Show all routes", "How to book?", "Payment methods"];
      }
    }
    // Ticket Booking Queries
    else if (userMessage.includes("book") || userMessage.includes("ticket") || userMessage.includes("buy")) {
      contextTopic = "booking";
      if (userMessage.includes("how") || userMessage.includes("process") || userMessage.includes("steps")) {
        response = "Here's how to book a ticket:\n\n";
        response += "1. Browse available routes from the 'Browse Routes' page\n";
        response += "2. Select your desired route and vehicle\n";
        response += "3. Choose your start and end stops\n";
        response += "4. Enter passenger details\n";
        response += "5. Complete payment via MTN Mobile Money\n";
        response += "6. Receive your ticket with QR code\n\n";
        response += "You'll earn loyalty points for every ticket purchase!";
        suggestions = ["Show available routes", "Payment methods", "Loyalty points info"];
      } else if (userMessage.includes("cancel") || userMessage.includes("refund")) {
        response = "To cancel or request a refund for your ticket:\n\n";
        response += "1. Go to 'My Tickets' in your dashboard\n";
        response += "2. Find the ticket you want to cancel\n";
        response += "3. Contact support for refund processing\n\n";
        response += "Note: Refunds are processed within 3-5 business days.";
        suggestions = ["View my tickets", "Contact support", "Booking help"];
      } else {
        response = "I can help you book a ticket! Here's what you need to know:\n\n";
        response += "• Browse routes and select your journey\n";
        response += "• Choose your stops and passenger details\n";
        response += "• Pay via MTN Mobile Money\n";
        response += "• Get instant confirmation with QR code\n\n";
        response += "Would you like to see available routes?";
        suggestions = ["Show routes", "Payment info", "How to book step by step"];
      }
    }
    // Payment Queries
    else if (userMessage.includes("payment") || userMessage.includes("pay") || userMessage.includes("money") || userMessage.includes("mtn")) {
      contextTopic = "payments";
      response = "Payment Information:\n\n";
      response += "💰 Payment Methods:\n";
      response += "• MTN Mobile Money (Rwanda)\n";
      response += "• Phone number format: 2507XXXXXXXX or 07XXXXXXXX\n\n";
      response += "💳 Payment Process:\n";
      response += "1. Select your ticket\n";
      response += "2. Enter your MTN Mobile Money phone number\n";
      response += "3. Confirm payment\n";
      response += "4. Receive instant confirmation\n\n";
      response += "✅ You'll earn loyalty points (1 point per 100 RWF spent)!";
      suggestions = ["How to book?", "Loyalty points", "View my tickets"];
    }
    // Loyalty Points Queries
    else if (userMessage.includes("loyalty") || userMessage.includes("points") || userMessage.includes("reward")) {
      contextTopic = "loyalty";
      if (user_id) {
        try {
          const loyaltyCheck = await pool.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = 'loyalty_points'
            )
          `);
          
          if (loyaltyCheck.rows[0]?.exists) {
            const loyalty = await pool.query(
              `SELECT * FROM loyalty_points WHERE passenger_id = $1`,
              [user_id]
            );
            
            if (loyalty.rows.length > 0) {
              const lp = loyalty.rows[0];
              response = `Your Loyalty Points:\n\n`;
              response += `⭐ Tier: ${lp.tier.toUpperCase()}\n`;
              response += `💰 Available Points: ${lp.available_points || 0}\n`;
              response += `📊 Total Earned: ${lp.total_points || 0}\n`;
              response += `🎁 Redeemed: ${lp.redeemed_points || 0}\n\n`;
              response += `Tiers:\n`;
              response += `• Bronze: 0-999 points\n`;
              response += `• Silver: 1,000-4,999 points\n`;
              response += `• Gold: 5,000-9,999 points\n`;
              response += `• Platinum: 10,000+ points\n\n`;
              response += `Earn 1 point for every 100 RWF spent!`;
            } else {
              response = "You don't have a loyalty account yet. Start earning points by booking tickets!";
            }
          } else {
            response = "Loyalty Program:\n\n";
            response += "• Earn 1 point per 100 RWF spent\n";
            response += "• Redeem points for discounts\n";
            response += "• Climb tiers: Bronze → Silver → Gold → Platinum\n";
            response += "• View your points in the dashboard";
          }
        } catch (err) {
          response = "Loyalty Program:\n\n";
          response += "• Earn 1 point per 100 RWF spent\n";
          response += "• Redeem points for discounts\n";
          response += "• View your points in the dashboard";
        }
      } else {
        response = "Loyalty Program:\n\n";
        response += "• Earn 1 point per 100 RWF spent\n";
        response += "• Redeem points for discounts\n";
        response += "• Climb tiers: Bronze → Silver → Gold → Platinum\n";
        response += "• Sign in to view your points";
      }
      suggestions = ["How to earn points?", "View my tickets", "Book a ticket"];
    }
    // Account/Profile Queries
    else if (userMessage.includes("account") || userMessage.includes("profile") || userMessage.includes("settings")) {
      contextTopic = "general";
      response = "Account Management:\n\n";
      response += "📱 Your Profile:\n";
      response += "• View and update your information in the dashboard\n";
      response += "• Check your booking history\n";
      response += "• Manage loyalty points\n\n";
      response += "🎫 My Tickets:\n";
      response += "• View all your bookings\n";
      response += "• Track active journeys\n";
      response += "• Access ticket QR codes\n\n";
      if (user_role === "admin") {
        response += "👨‍💼 Admin Features:\n";
        response += "• Manage routes, drivers, and vehicles\n";
        response += "• View analytics and reports\n";
        response += "• Handle passenger inquiries";
      }
      suggestions = ["View my tickets", "Booking help", "Contact support"];
    }
    // Tracking Queries
    else if (userMessage.includes("track") || userMessage.includes("location") || userMessage.includes("where")) {
      contextTopic = "tracking";
      response = "Vehicle Tracking:\n\n";
      response += "📍 How to Track:\n";
      response += "1. Go to 'My Tickets' in your dashboard\n";
      response += "2. Find your active journey\n";
      response += "3. Click 'Track Vehicle' to see real-time location\n";
      response += "4. View route map and location updates\n\n";
      response += "🚌 Features:\n";
      response += "• Real-time GPS tracking\n";
      response += "• Route visualization\n";
      response += "• Location updates from driver";
      suggestions = ["View my tickets", "How to book?", "Contact driver"];
    }
    // Help/Support Queries
    else if (userMessage.includes("help") || userMessage.includes("support") || userMessage.includes("contact")) {
      contextTopic = "support";
      response = "How can I help you?\n\n";
      response += "I can assist you with:\n";
      response += "• 📍 Finding routes and schedules\n";
      response += "• 🎫 Booking tickets\n";
      response += "• 💰 Payment information\n";
      response += "• ⭐ Loyalty points and rewards\n";
      response += "• 🚌 Vehicle tracking\n";
      response += "• 📱 Account management\n\n";
      response += "Just ask me anything about the platform!";
      suggestions = ["Show routes", "How to book?", "Payment info"];
    }
    // Greetings
    else if (userMessage.includes("hello") || userMessage.includes("hi") || userMessage.includes("hey") || userMessage.startsWith("h")) {
      contextTopic = "general";
      response = "Hello! 👋 Welcome to Camny Transport!\n\n";
      response += "I'm here to help you with:\n";
      response += "• Finding routes\n";
      response += "• Booking tickets\n";
      response += "• Payment questions\n";
      response += "• Loyalty points\n";
      response += "• And much more!\n\n";
      response += "What would you like to know?";
      suggestions = ["Show routes", "How to book?", "Payment methods"];
    }
    // Default response
    else {
      contextTopic = "general";
      response = "I'm here to help! I can assist you with:\n\n";
      response += "🔍 Route Information\n";
      response += "🎫 Ticket Booking\n";
      response += "💰 Payments\n";
      response += "⭐ Loyalty Points\n";
      response += "🚌 Vehicle Tracking\n";
      response += "📱 Account Help\n\n";
      response += "Try asking:\n";
      response += "• 'Show all routes'\n";
      response += "• 'How do I book a ticket?'\n";
      response += "• 'What are the payment methods?'\n";
      response += "• 'Tell me about loyalty points'";
      suggestions = ["Show routes", "How to book?", "Payment info", "Help"];
    }

    ({ response, suggestions } = applyRoleContext(user_role, contextTopic, response, suggestions));

    // Add timestamp
    const timestamp = new Date().toISOString();

    res.status(200).json({
      response,
      suggestions,
      timestamp
    });
  } catch (err) {
    console.error("Error in chatbot:", err);
    res.status(500).json({ 
      error: "Sorry, I encountered an error. Please try again.",
      response: "I'm having trouble right now. Please try rephrasing your question or contact support.",
      suggestions: ["Try again", "Contact support", "Help"]
    });
  }
};

// Get chat history (optional - for future enhancement)
export const getChatHistory = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Check if chat_history table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chat_history'
      )
    `);

    if (!tableCheck.rows[0]?.exists) {
      return res.status(200).json([]);
    }

    const result = await pool.query(
      `SELECT * FROM chat_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [user_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};

