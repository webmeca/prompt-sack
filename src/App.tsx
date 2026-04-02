/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LibraryView } from './features/prompts/LibraryView';
import { InboxView } from './features/prompts/InboxView';
import { SettingsView } from './features/settings/SettingsView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LibraryView viewMode="all" />} />
          <Route path="recent" element={<LibraryView viewMode="recent" />} />
          <Route path="favorites" element={<LibraryView viewMode="favorites" />} />
          <Route path="archive" element={<LibraryView viewMode="archive" />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
