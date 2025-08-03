# Guidance on how to parse different bank's credit card statements

## Chase

- All Chase cards share a similar statement layout.
- On page 1, there are two pieces of information we need to extract:

  1.  The last four digits of the credit card. This is shown directly under 'ACCOUNT SUMMARY' as the text 'Account Number: XXXX XXXX XXXX 1234' where 1234 is the last four digits of the credit card.
  2.  The closing date of the statement that we refer to in our schema as 'statement_date'. This is again under 'ACCOUNT SUMMARY' but further down the list of fields. It has the text 'Opening/Closing Date' and gives the dates as 'MM/DD/YY - MM/DD/YY' where the first is the opening date and the second is the closing date.

- Starting on page 3 is the list of charges and payments that we want to capture. These start under the heading 'ACCOUNT ACTIVITY' and are broken into up to three sections. The first is 'PAYMENTS AND OTHER CREDITS' that list payments on the card, which have a transaction description like 'Payment Thank You-Mobile', and also any credits. We will want to filter out the payments on the card, but do want credits. The second is 'PURCHASE' which lists charges. And there is sometimes a final 'FEES CHARGED' section which we can ignore.

  - Each charge or payment has three pieces of information arranged horizontally across the page as three columns. The first column gives the date of the transaction. This is in MM/DD format. The second column gives the merchant name or transaction description. It is usually one row of text, but can be up to three rows, particularly in the case of foreign currency transactions as the conversion rate is given. The merchant however is always shown on the first row. The final column is the amount, given in USD, and is negative for credits.

## Wells Fargo

TODO
