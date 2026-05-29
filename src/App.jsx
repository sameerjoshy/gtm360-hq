import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import CommandCenter from './views/CommandCenter'
import SamView from './views/SamView'
import RexView from './views/RexView'
import AndyView from './views/AndyView'
import FinnView from './views/FinnView'
import OlaView from './views/OlaView'
import OKRsView from './views/OKRsView'
import OzView from './views/OzView'
import ErrorsView from './views/ErrorsView'
import StubView from './views/StubView'

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Layout>
          <Routes>
            <Route path="/"            element={<CommandCenter />} />
            <Route path="/sam"         element={<SamView />} />
            <Route path="/rex"         element={<RexView />} />
            <Route path="/andy"        element={<AndyView />} />
            <Route path="/finn"        element={<FinnView />} />
            <Route path="/ola"         element={<OlaView />} />
            <Route path="/pipeline"    element={<StubView title="Pipeline" />} />
            <Route path="/content"     element={<StubView title="Content Calendar" />} />
            <Route path="/finance"     element={<StubView title="Finance" />} />
            <Route path="/okrs"        element={<OKRsView />} />
            <Route path="/outreach"    element={<OzView />} />
            <Route path="/automations" element={<StubView title="Automations" />} />
            <Route path="/errors"      element={<ErrorsView />} />
            <Route path="/settings"    element={<StubView title="Settings" />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
