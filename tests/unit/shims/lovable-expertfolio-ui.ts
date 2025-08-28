// Minimal shim for @lovable/expertfolio-ui to allow unit tests without React SSR issues
import React from 'react';

export const ExpertfolioContext = React.createContext<any>(null);
export const ExpertfolioProvider: React.FC<any> = ({ children }) => React.createElement(React.Fragment, null, children as any);

export const ConnectedAdminAuditLogsPage: React.FC<any> = () => React.createElement('div', null, 'Audit Logs') as any;
export const ConnectedFilesPage: React.FC<any> = () => React.createElement('div', null, 'Files') as any;

export default {} as any;


