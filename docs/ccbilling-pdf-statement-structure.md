# Guidance on how to parse different bank's credit card statements

## Chase

- All Chase cards share a similar statement layout.
- On page 1, there are two pieces of information we need to extract:

  1.  The last four digits of the credit card. This is shown directly under 'ACCOUNT SUMMARY' as the text 'Account Number: XXXX XXXX XXXX 1234' where 1234 is the last four digits of the credit card.
  2.  The closing date of the statement that we refer to in our schema as 'statement_date'. This is again under 'ACCOUNT SUMMARY' but further down the list of fields. It has the text 'Opening/Closing Date' and gives the dates as 'MM/DD/YY - MM/DD/YY' where the first is the opening date and the second is the closing date. Note: We need to combine the year of the closing date, being careful around year changes, with the MM/DD of charges to get the full day/month/year for each charge.

- Starting on page 3 is the list of charges and payments that we want to capture. These start under the heading 'ACCOUNT ACTIVITY' and are broken into up to three sections. The first is 'PAYMENTS AND OTHER CREDITS' that list payments on the card, which have a transaction description like 'Payment Thank You-Mobile', and also any credits. We will want to filter out the payments on the card, but do want credits. The second is 'PURCHASE' which lists charges. And there is sometimes a final 'FEES CHARGED' section which we can ignore.

  - Each charge or payment has three pieces of information arranged horizontally across the page as three columns. The first column gives the date of the transaction. This is in MM/DD format. The second column gives the merchant name or transaction description. It is usually one row of text, but can be up to three rows, particularly in the case of foreign currency transactions as the conversion rate is given. The merchant however is always shown on the first row. The final column is the amount, given in USD, and is negative for credits.

## Wells Fargo

- On page 1, there are two pieces of information we need to extract:

  1.  The last four digits of the credit card. This is shown at the top of the page in the line 'Account Number Ending in XXXX' where XXXX are the last four digits of the credit card.
  2.  The statement date. This is in the line below the 'Account Number Ending' line and is in the text 'Billing Cycle MM/DD/YYYY to MM/DD/YYYY' where the statement end date is the second of these dates.

- On page 1, the list of charges and payments begin, under a title 'Transaction Summary'.

  - Each transaction can be on one or three lines. The first column is the date of the transaction in MM/YY format. As with Chase, we will need to use the year of the statement date to determine the year of the transaction - taking into account transactions that are close to the end or beginning of a year. The description of the transaction or merchant is in the fifth column under the title 'Description of Transaction or Credit'. If the charge is a payment for statement then it has text like 'ONLINE ACH PAYMENT THANK YOU' and we should ignore it in the same as we do for Chase statements. Foreign currency transactions, like for Chase, can span three lines and have the merchant on the first line, the foreign currency on the second, e.g. 'DK KRONE' and the final line is the foreign currency amount and conversion ratio to USD in the form '<FOREIGN CURRENCY> X <CONVERSION FACTOR>. The final column 'Amount' is the amount of the transaction, with negative for credits. It has a $ sign, e.g. $2.90

- On page 3, and subsequent pages, transactions continue with the title 'Transactions Summary (continued) before the next sections 'Fees Charged', 'Interest Charged' and finally 'BiltProtect Summary' are given. After this there are additional pages, mostly blank, but we don't need any information from them.
