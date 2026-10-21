/**
 * Default billing adapter for the pipeline.
 * Wraps backend/services/creditService.js with the pipeline billing port interface:
 *   charge({ userId, amount, reference, metadata })
 *   refund({ userId, amount, reference, metadata })
 *
 * Both methods forward to creditService using the "planner" productType and
 * TRANSACTION_SOURCES.AI_GENERATION. Insufficient balance causes a PipelineError
 * with code INSUFFICIENT_CREDITS and HTTP status 402.
 */
import creditService from "../services/creditService.js";
import {
  TRANSACTION_SOURCES,
} from "../config/credits.js";
import { PipelineError } from "./contracts.js";

export const defaultBillingAdapter = {
  async charge({ userId, amount, reference, metadata = {} }) {
    try {
      await creditService.deductCredits(
        userId,
        amount,
        TRANSACTION_SOURCES.AI_GENERATION,
        reference,
        metadata,
        "planner",
      );
    } catch (error) {
      if (error.code === "INSUFFICIENT_CREDITS") {
        throw new PipelineError(
          "INSUFFICIENT_CREDITS",
          "Insufficient planner credits for this operation",
          402,
        );
      }
      throw error;
    }
  },

  async refund({ userId, amount, reference, metadata = {} }) {
    await creditService.refundCredits(
      userId,
      amount,
      reference,
      metadata,
      "planner",
    );
  },
};
