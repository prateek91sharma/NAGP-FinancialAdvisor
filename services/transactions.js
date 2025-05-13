const files = require('./files');
const moment = require('moment');
const utils = require('../utils');

const invalidTransactionDuration = `Invalid Duration provided.`
const invalidTransactionDurationFutureDate = `Future Date Provided.`

const provideTransactionsDuration = `Kindly provide a time period.`;
const durationSuggestions = ['Current Financial Year', 'Previous Financial Year'];
const noPastTransactionFoundMsg = `No past transactions found.\n`;
const promptForMoreInvestment = `Do you want to invest more?`;
function setupTransactionManagerIntents(intentMap) {
    intentMap.set('Transaction_Period_Entered', validateDurationAndRespond);
    intentMap.set('Transaction_Display_Invest_More', handleMoreInvestmentUserInput);
}

function handleMoreInvestmentUserInput(agent) {
    const phone = agent.context.get('transactions_flow_invest_more')?.parameters?.phone;
    const confirmation = agent.parameters.confirmation;
    console.log('Inside Transaction_Display_Invest_More callback', phone, confirmation);
    if (confirmation === 'yes') {
        agent.context.delete('transactions_flow_invest_more');
        agent.context.set({name:'services_displayed', lifespan:1});
        agent.add('');
        agent.setFollowupEvent({
            name: 'TRANSACTIONS_FOLLOWUP_EXPORE_FUNDS',
            parameters: { 'value': phone }
        });
    } else if (confirmation === 'no') {
        agent.add(`Thank you for using our services`);
        agent.clearOutgoingContexts();
        agent.end('Goodbye!');
    } else {
        agent.add(`Invalid response!!. Please reply with Yes or No.`);
        utils.carryForwardSameContext(agent, 'transactions_flow_invest_more');
    }
}

function validateDurationAndRespond(agent) {
    const phone = agent.context.get('transactions_flow_started')?.parameters?.phone;
    const suggestion = agent.parameters?.suggestion;
    const start = agent.parameters?.datePeriod?.startDate;
    const end = agent.parameters?.datePeriod?.endDate;
    console.log('Inside Transaction_Period_Entered callback', phone, suggestion, start, end);

    let transactions;
    if (suggestion) {
        if (suggestion != 'current' && suggestion != 'previous') {
            promptForTimePeriod(agent, phone, invalidTransactionDuration);
            return;
        } else {
            transactions = files.getTransactionByDateRange(phone.toString(), suggestion);
        }
    } else {
        if (start && end) {
            const startDate = moment(start);
            const endDate = moment(end);
            if (startDate.isAfter(moment()) || endDate.isAfter(moment())) {
                promptForTimePeriod(agent, phone, invalidTransactionDurationFutureDate);
                return;
            }
            transactions = files.getTransactionByDateRange(phone.toString(), '', startDate, endDate);
        } else {
            promptForTimePeriod(agent, phone, invalidTransactionDuration);
            return;
        }
    }
    console.log('Transactions found', transactions.length);
    if (transactions.length === 0) {
        agent.add(noPastTransactionFoundMsg + promptForMoreInvestment);
    } else {
        // agent.add(`Transactions for ${phone}`);
        //showTransactionsAsTable(agent);
        showTransactionsAsTelegramPayload(agent, transactions);
        // agent.add(promptForMoreInvestment);
    }
    utils.carryForwardDifferentContext(agent, 'transactions_flow_started', 'transactions_flow_invest_more');
}

function noTransactionsMsg(agent) {
    //noTransactionsDialogFlowMsg(agent);
    noTransactionsTelegramMsg(agent);
}

function noTransactionsDialogFlowMsg(agent) {
    agent.add(noPastTransactionFoundMsg + promptForMoreInvestment);
}
function noTransactionsTelegramMsg(agent) {
    utils.renderAsTelegramPayload(agent, `<b>${noPastTransactionFoundMsg}</b>${promptForMoreInvestment}`, ['Yes', 'No'])
}

function promptForTimePeriod(agent, phone, errorMsg) {
    agent.context.delete('contact_info_asked');
    promptForTimePeriodMsg(agent, errorMsg);
    agent.context.set({ name: "transactions_flow_started", lifespan: 1, parameters: { 'phone': phone } });
}

function promptForTimePeriodMsg(agent, errorMsg){
    // promptForTimePeriodDialogFlowMsg(agent, errorMsg);
    promptForTimePeriodTelegramMsg(agent, errorMsg);
}

function promptForTimePeriodDialogFlowMsg(agent, errorMsg) {
    const msg = errorMsg ? errorMsg+'\n' + provideTransactionsDuration : provideTransactionsDuration;
    agent.add(msg);
    utils.createSuggestionFromList(agent, durationSuggestions);
}

function promptForTimePeriodTelegramMsg(agent, errorMsg){
    utils.createTelegramSuggestionFromList(agent,provideTransactionsDuration, durationSuggestions, errorMsg)
}
function showTransactionsAsTable(agent){
    agent.add(new Table({
        title: 'Transactions list',
        columns: [
            { header: 'Date' },
            { header: 'Portfolio' },
            { header: 'Amount' }
        ],
        rows: transactions.splice(0, 3).map(fund => ({
            cells: [fund.date, fund.portfolio_no, fund.amount],
        }))
    }));
}

function showTransactionsAsTelegramPayload(agent, transactions) {
    const header = `Date       | Portfolio      | Amount \n-------------------------------------\n`;
    const rows = transactions.splice(0, 3).map(tx =>
        `${tx.date.padEnd(10)} | ${tx.portfolio_no.padEnd(14)} | ${tx.amount.toString().padEnd(8)}`
    ).join('\n');
    const tableMessage =  `<b>Your Transactions</b>\n<pre>${header}${rows}</pre>\n<b>${promptForMoreInvestment}</b>`;
    console.log('tableMessage', tableMessage)
    utils.renderAsTelegramPayload(agent, tableMessage,['Yes','No']);
}

function customTelegramRichResponse(agent, res) {
    console.log('tableMessage', tableMessage);
    agent.add('');
    if (agent.requestSource === agent.TELEGRAM) {
      res.json({
        fulfillmentMessages: [
          {
            platform: 'TELEGRAM',
            payload: {
                telegram: {
                    text: `${tableMessage} + \n<b>${promptForMoreInvestment}<b>`,
                    parse_mode: 'HTML'
                }
            }
          }
        ]
      });
      return true;
    } else {
        agent.add(`Transactions for ${phone}`);
        showTransactionsAsTable(agent);
        agent.add(promptForMoreInvestment);
        return false;
    }
  }

module.exports = {
    setupTransactionManagerIntents,
    promptForTimePeriod,
    customTelegramRichResponse
}