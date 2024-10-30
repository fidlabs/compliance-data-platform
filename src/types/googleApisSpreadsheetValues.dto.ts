export class GoogleApisSpreadsheetValuesDto {
  range: string;
  majorDimenstion: string;
  values: Map<number, Map<number, string>>;
}
