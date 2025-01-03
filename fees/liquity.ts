import * as sdk from "@defillama/sdk";
import { Adapter, ChainBlocks, FetchOptions, } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
const { request, gql } = require("graphql-request");


const URL = sdk.graph.modifyEndpoint('8wump5sEYBV7vG1sKaNrvbqhTAV4EPKCdPw4ygms3Dmd')
interface IValue {
  totalBorrowingFeesPaid: string;
  totalRedemptionFeesPaid: string;
}
interface IDailyResponse {
  yesterday: IValue;
  today: IValue;
}

const adapter: Adapter = {
  adapter: {
    [CHAIN.ETHEREUM]: {
        fetch:  async (timestamp: number, _: ChainBlocks, { createBalances, getFromBlock, getToBlock, }: FetchOptions) => {
          const dailyFees = createBalances()

          const graphQueryDaily = gql
          `query fees($startOfDayBlock: Int!, $endOfDayBlock: Int!) {
            yesterday: global(id: "only", block: {number: $startOfDayBlock}) {
              totalBorrowingFeesPaid
              totalRedemptionFeesPaid
            }
            today: global(id: "only", block: {number: $endOfDayBlock}) {
              totalBorrowingFeesPaid
              totalRedemptionFeesPaid
            }
          }`;


          const graphResDaily: IDailyResponse = await request(URL, graphQueryDaily, {startOfDayBlock: await getFromBlock(), endOfDayBlock: await getToBlock()});
          const borrowingFees =   Number(graphResDaily.today.totalBorrowingFeesPaid) - Number(graphResDaily.yesterday.totalBorrowingFeesPaid);
          const redemptionFeesETH = Number(graphResDaily.today.totalRedemptionFeesPaid) - Number(graphResDaily.yesterday.totalRedemptionFeesPaid);

          dailyFees.addCGToken('tether', borrowingFees);
          dailyFees.addGasToken(redemptionFeesETH * 10 ** 18);

          return {
              timestamp,
              dailyFees: dailyFees,
              dailyRevenue: dailyFees,
              dailyHoldersRevenue: dailyFees,
          };
        },
        start: '2019-12-01'
    },
  }
}

export default adapter;
