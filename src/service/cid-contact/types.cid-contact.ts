export interface IPNIProvider {
  AddrInfo: {
    ID: string;
    Addrs: string[];
  };
  LastAdvertisement: {
    [key: string]: string;
  };
  LastAdvertisementTime: string;
  Publisher: {
    ID: string;
    Addrs: string[];
  };
  ExtendedProviders: any;
  FrozenAt: string | null;
}

export interface IPNIAdvertisement {
  ID: string;
  Addresses: string[];
  ContextID: {
    [key: string]: {
      bytes: string;
    };
  };
  Entries: {
    [key: string]: string;
  };
  ExtendedProvider: {
    Override: boolean;
    Providers: string[];
  };
  IsRm: boolean;
  Metadata: {
    [key: string]: {
      bytes: string;
    };
  };
  PreviousID: {
    [key: string]: string;
  };
  Provider: string;
  Signature: {
    [key: string]: {
      bytes: string;
    };
  };
}
