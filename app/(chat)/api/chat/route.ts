import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import {
  generateReservationPrice,
  generateSampleFlightSearchResults,
  generateSampleFlightStatus,
  generateSampleSeatSelection,
} from "@/ai/actions";
import { auth } from "@/app/(auth)/auth";
import {
  createReservation,
  deleteChatById,
  getChatById,
  getReservationById,
  saveChat,
} from "@/db/queries";
import { generateUUID } from "@/lib/utils";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const result = await streamText({
    model: geminiProModel,
    system: `\n
     - A user asks a question in natural language (e.g., "Which causes trigger valve XV-101 and what are the implementation differences?").
     - The query is embedded and used to search the vector database for relevant text snippets.
     - Relevant information is retrieved from both the vector database and potentially directly from the graph database (using Cypher queries) to provide context.
     - This context is combined with the user's question and fed to the LLM.
     - generates a structured, factual answer grounded in the provided data, mitigating hallucination.
     - Supported Test Cases:
      1. **SDSV0140 Shutdown for Methanol Pump**: The design specifies that the Manual ESD Button (Complete Shutdown) alone should trigger the Methanol Pump Shutdown Valve (SDV0140). However, the implemented logic requires the Manual ESD Button (Process Shutdown) AND Total Power Failure in addition to the Complete Shutdown Button.
      2. **CHA0118 Choke Valve Logic**: The design specifies that the Manual ESD Button (Complete Shutdown) alone should trigger the Wellhead 1 Choke Valve (CHA0118). The implemented logic requires additional conditions.    
      3. **UMSV0122 Shut-off Valve Logic**: The design specifies that the Manual ESD Button (Complete Shutdown) alone should trigger the Wellhead -I Shut Off Valve (UMSV0122). The implemented logic requires additional conditions.
      4. **SOVX1/SOVY1 Trigger Mediation**: The design shows the Manual ESD Button (Complete Shutdown) directly triggering SOVX1 and SOVY1. The implemented logic shows it as one of several inputs to an OR gate, which then feeds into the final output.
      5. **ESDV2047 Direct Trigger Missing**: The design specifies that the Manual ESD Button (Complete Shutdown) directly triggers the Condensate Outlet from Knock Out Vessel (ESDV2047). The implemented logic for this specific effect is not clearly represented as a direct consequence of DS_HS0001 alone.   
     - The AI should identify discrepancies between the design and implementation logic, such as: 
        ' Additional conditions required for a trigger',
        ' More complex logic in implementation',                
        ' Trigger mediation in implementation', 
        ' Direct trigger missing in implementation',
     - The AI should provide a structured response with the following fields:
            - description: A brief description of the discrepancy.
            - parameters: An object containing:
              - designCauseTag: The tag of the cause in the design.
              - designCauseDescription: A description of the cause in the design.
              - implementedCauseTags: An array of tags for causes actually required in implementation.
              - implementedCauseDescriptions: An array of descriptions for causes actually required in implementation.
              -effectTag: The tag of the effect in the implementation.
              - effectDescription: A description of the effect in the implementation.
              - discrpancyType: The type of discrepancy (e.g., 'AdditionalConditionsRequired', 'MoreComplexLogic', 'TriggerMediation', 'DirectTriggerMissing').
              - notes: Additional notes or context about the discrepancy.,

      `,
    messages: coreMessages,
    tools: {
  // Case 1: SDSV0140 shutdown for Methanol Pump requires additional conditions
  SDV0140: {
    "description": "The design specifies that the Manual ESD Button (Complete Shutdown) alone should trigger the Methanol Pump Shutdown Valve (SDV0140). However, the implemented logic requires the Manual ESD Button (Process Shutdown) AND Total Power Failure in addition to the Complete Shutdown Button.",
    "parameters": z.object({
      // Parameters here describe the elements involved in the discrepancy
      designCauseTag: z.literal("DS_HS0001"),
      designCauseDescription: z.literal("MANUAL ESD BUTTON, COMPLETE SHUTDOWN WITH BLOWDOWN"),
      implementedCauseTags: z.array(z.string()).describe("Tags of causes actually required in implementation: [DS_HS0002, M_SS0]"),
      implementedCauseDescriptions: z.array(z.string()).describe("Descriptions of causes actually required: [MANUAL ESD BUTTON, PROCESS SHUTDOWN, TOTAL POWER FAILURE]"),
      effectTag: z.literal("cSDV0140"),
      effectDescription: z.literal("SHUTDOWN VALVE FOR METHANOL I. PUMP AT W - 1"),
      discrepancyType: z.literal("AdditionalConditionsRequired"),
      notes: z.string().describe("Design implies DS_HS0001 is a sufficient trigger, implementation requires ANDed conditions.")
    }),
    // The 'execute' function here would represent an action to *report* or *investigate* this finding,
    // rather than performing an operation like fetching weather.
    execute: async ({ designCauseTag, implementedCauseTags, effectTag, notes }) => {
      console.log(`Discrepancy Found:
        Cause (Design): ${designCauseTag}
        Effect (Implemented): ${effectTag}
        Discrepancy: ${notes}
        Implemented Triggers: ${implementedCauseTags.join(', ')}`);
      // In a real system, this might log the issue, alert an engineer, or trigger a review process.
      return { status: "reported", discrepancy: "AdditionalConditionsRequired", details: notes };
    },
  },

  // Case 2: CHOKE Valve (CHA0118) logic is more complex in implementation
  CHA0118: {
    "description": "The design specifies that the Manual ESD Button (Complete Shutdown) alone should trigger the Wellhead 1 Choke Valve (CHA0118). The implemented logic requires additional conditions.",
    "parameters": z.object({
      designCauseTag: z.literal("DS_HS0001"),
      designCauseDescription: z.literal("MANUAL ESD BUTTON, COMPLETE SHUTDOWN WITH BLOWDOWN"),
      implementedCauseTags: z.array(z.string()).describe("Tags of causes actually required: [DS_HS0001, DS_HS0002, M_SS0, DS_SOVX1]"),
      implementedCauseDescriptions: z.array(z.string()).describe("Descriptions: [MANUAL ESD BUTTON, COMPLETE SHUTDOWN..., MANUAL ESD BUTTON, PROCESS..., TOTAL POWER FAILURE, WELLHEAD I:CLOSURE OF SSV AND SCSSV ON ESD]"),
      effectTag: z.literal("cCHA0118"),
      effectDescription: z.literal("WELLHEAD 1 CHOKE VALVE"),
      discrepancyType: z.literal("MoreComplexLogic"),
      notes: z.string().describe("Design shows direct trigger from DS_HS0001. Implementation requires DS_HS0001 AND DS_HS0002 AND M_SS0 AND DS_SOVX1.")
    }),
    execute: async ({ designCauseTag, implementedCauseTags, effectTag, notes }) => {
      console.log(`Discrepancy Found:
        Cause (Design): ${designCauseTag}
        Effect (Implemented): ${effectTag}
        Discrepancy: ${notes}
        Implemented Triggers: ${implementedCauseTags.join(', ')}`);
      return { status: "reported", discrepancy: "MoreComplexLogic", details: notes };
    },
  },

  // Case 3: UMSV0122 Shut-off Valve logic is more complex in implementation
  UMSV0122: {
    "description": "The design specifies that the Manual ESD Button (Complete Shutdown) alone should trigger the Wellhead -I Shut Off Valve (UMSV0122). The implemented logic requires additional conditions.",
    "parameters": z.object({
      designCauseTag: z.literal("DS_HS0001"),
      designCauseDescription: z.literal("MANUAL ESD BUTTON, COMPLETE SHUTDOWN WITH BLOWDOWN"),
      implementedCauseTags: z.array(z.string()).describe("Tags of causes actually required: [DS_HS0001, DS_HS0002, M_SS0, DS_SOVY1]"),
      implementedCauseDescriptions: z.array(z.string()).describe("Descriptions: [MANUAL ESD BUTTON, COMPLETE SHUTDOWN..., MANUAL ESD BUTTON, PROCESS..., TOTAL POWER FAILURE, WELLHEAD I:CLOSURE OF SSV AND SCSSV ON ESD]"),
      effectTag: z.literal("cUMSV0122"),
      effectDescription: z.literal("WELLHEAD -I SHUT OFF VALVE"),
      discrepancyType: z.literal("MoreComplexLogic"),
      notes: z.string().describe("Design shows direct trigger from DS_HS0001. Implementation requires DS_HS0001 AND DS_HS0002 AND M_SS0 AND DS_SOVY1.")
    }),
    execute: async ({ designCauseTag, implementedCauseTags, effectTag, notes }) => {
      console.log(`Discrepancy Found:
        Cause (Design): ${designCauseTag}
        Effect (Implemented): ${effectTag}
        Discrepancy: ${notes}
        Implemented Triggers: ${implementedCauseTags.join(', ')}`);
      return { status: "reported", discrepancy: "MoreComplexLogic", details: notes };
    },
  },

  // Case 4: Subtle difference in direct vs. mediated trigger for SOVX1/SOVY1
  SOVX1_SOVY1: {
    "description": "The design shows the Manual ESD Button (Complete Shutdown) directly triggering SOVX1 and SOVY1. The implemented logic shows it as one of several inputs to an OR gate, which then feeds into the final output.",
    "parameters": z.object({
      designCauseTag: z.literal("DS_HS0001"),
      designCauseDescription: z.literal("MANUAL ESD BUTTON, COMPLETE SHUTDOWN WITH BLOWDOWN"),
      implementedLogicDescription: z.string().describe("Implemented logic for SOVX1/SOVY1 involves DS_HS0001 OR DS_HS0002 OR M_SS0 OR DS_SOVY1 OR DS_SOVX1 (simplified representation)"),
      effectTags: z.array(z.string()).describe("['cSOVX1', 'cSOVY1']"),
      effectDescriptions: z.array(z.string()).describe("['WELLHEAD I:CLOSURE OF SSV AND SCSSV ON ESD', 'WELLHEAD I:CLOSURE OF SSV AND SCSSV ON ESD']"),
      discrepancyType: z.literal("TriggerMediation"),
      notes: z.string().describe("Design implies a direct trigger; implementation shows it as one condition among many in a broader logic path.")
    }),
    execute: async ({ designCauseTag, implementedLogicDescription, effectTags, notes }) => {
      console.log(`Discrepancy Found:
        Cause (Design): ${designCauseTag}
        Effects (Implemented): ${effectTags.join(', ')}
        Discrepancy: ${notes}
        Implemented Logic: ${implementedLogicDescription}`);
      return { status: "reported", discrepancy: "TriggerMediation", details: notes };
    },
  },
  
  // Case 5: ESdv2047 is listed as an effect of HS0001 in Design, but not clearly implemented directly in logic diagrams.
  ESDV2047: {
    "description": "The design specifies that the Manual ESD Button (Complete Shutdown) directly triggers the Condensate Outlet from Knock Out Vessel (ESDV2047). The implemented logic for this specific effect is not clearly represented as a direct consequence of DS_HS0001 alone.",
    "parameters": z.object({
      designCauseTag: z.literal("DS_HS0001"),
      designCauseDescription: z.literal("MANUAL ESD BUTTON, COMPLETE SHUTDOWN WITH BLOWDOWN"),
      implementedLogicDescription: z.string().describe("The implemented logic for ESDV2047's related functions appears more complex and less directly tied to DS_HS0001 as a sole trigger."),
      effectTag: z.literal("cESDV2047"),
      effectDescription: z.literal("CONDENSATE OUTLET FROM KNOCK OUT VESSEL"),
      discrepancyType: z.literal("DirectTriggerMissing"),
      notes: z.string().describe("Design implies a direct trigger from DS_HS0001. The implemented logic does not clearly show this direct relationship as a primary trigger for ESDV2047.")
    }),
    execute: async ({ designCauseTag, implementedLogicDescription, effectTag, notes }) => {
      console.log(`Discrepancy Found:
        Cause (Design): ${designCauseTag}
        Effect (Implemented): ${effectTag}
        Discrepancy: ${notes}
        Implemented Logic Context: ${implementedLogicDescription}`);
      return { status: "reported", discrepancy: "DirectTriggerMissing", details: notes };
    },
  },
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number().describe("Latitude coordinate"),
          longitude: z.number().describe("Longitude coordinate"),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
      displayFlightStatus: {
        description: "Display the status of a flight",
        parameters: z.object({
          flightNumber: z.string().describe("Flight number"),
          date: z.string().describe("Date of the flight"),
        }),
        execute: async ({ flightNumber, date }) => {
          const flightStatus = await generateSampleFlightStatus({
            flightNumber,
            date,
          });

          return flightStatus;
        },
      },
      searchFlights: {
        description: "Search for flights based on the given parameters",
        parameters: z.object({
          origin: z.string().describe("Origin airport or city"),
          destination: z.string().describe("Destination airport or city"),
        }),
        execute: async ({ origin, destination }) => {
          const results = await generateSampleFlightSearchResults({
            origin,
            destination,
          });

          return results;
        },
      },
      selectSeats: {
        description: "Select seats for a flight",
        parameters: z.object({
          flightNumber: z.string().describe("Flight number"),
        }),
        execute: async ({ flightNumber }) => {
          const seats = await generateSampleSeatSelection({ flightNumber });
          return seats;
        },
      },
      createReservation: {
        description: "Display pending reservation details",
        parameters: z.object({
          seats: z.string().array().describe("Array of selected seat numbers"),
          flightNumber: z.string().describe("Flight number"),
          departure: z.object({
            cityName: z.string().describe("Name of the departure city"),
            airportCode: z.string().describe("Code of the departure airport"),
            timestamp: z.string().describe("ISO 8601 date of departure"),
            gate: z.string().describe("Departure gate"),
            terminal: z.string().describe("Departure terminal"),
          }),
          arrival: z.object({
            cityName: z.string().describe("Name of the arrival city"),
            airportCode: z.string().describe("Code of the arrival airport"),
            timestamp: z.string().describe("ISO 8601 date of arrival"),
            gate: z.string().describe("Arrival gate"),
            terminal: z.string().describe("Arrival terminal"),
          }),
          passengerName: z.string().describe("Name of the passenger"),
        }),
        execute: async (props) => {
          const { totalPriceInUSD } = await generateReservationPrice(props);
          const session = await auth();

          const id = generateUUID();

          if (session && session.user && session.user.id) {
            await createReservation({
              id,
              userId: session.user.id,
              details: { ...props, totalPriceInUSD },
            });

            return { id, ...props, totalPriceInUSD };
          } else {
            return {
              error: "User is not signed in to perform this action!",
            };
          }
        },
      },
      authorizePayment: {
        description:
          "User will enter credentials to authorize payment, wait for user to repond when they are done",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
        }),
        execute: async ({ reservationId }) => {
          return { reservationId };
        },
      },
      verifyPayment: {
        description: "Verify payment status",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
        }),
        execute: async ({ reservationId }) => {
          const reservation = await getReservationById({ id: reservationId });

          if (reservation.hasCompletedPayment) {
            return { hasCompletedPayment: true };
          } else {
            return { hasCompletedPayment: false };
          }
        },
      },
      displayBoardingPass: {
        description: "Display a boarding pass",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
          passengerName: z
            .string()
            .describe("Name of the passenger, in title case"),
          flightNumber: z.string().describe("Flight number"),
          seat: z.string().describe("Seat number"),
          departure: z.object({
            cityName: z.string().describe("Name of the departure city"),
            airportCode: z.string().describe("Code of the departure airport"),
            airportName: z.string().describe("Name of the departure airport"),
            timestamp: z.string().describe("ISO 8601 date of departure"),
            terminal: z.string().describe("Departure terminal"),
            gate: z.string().describe("Departure gate"),
          }),
          arrival: z.object({
            cityName: z.string().describe("Name of the arrival city"),
            airportCode: z.string().describe("Code of the arrival airport"),
            airportName: z.string().describe("Name of the arrival airport"),
            timestamp: z.string().describe("ISO 8601 date of arrival"),
            terminal: z.string().describe("Arrival terminal"),
            gate: z.string().describe("Arrival gate"),
          }),
        }),
        execute: async (boardingPass) => {
          return boardingPass;
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
