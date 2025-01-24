export interface IPResponse {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org?: string;
  postal?: string;
  timezone: string;
  bogon?: boolean;
}

export interface Address {
  address: string;
  port: number;
  protocol: string;
}
