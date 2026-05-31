import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Landing from './pages/Landing'
import CommandCenter from './views/CommandCenter'
import SamView from './views/SamView'
import RexView from './views/RexView'
import AndyView from './views/AndyView'
import FinnView from './views/FinnView'
import OlaView from './views/OlaView'
import OKRsView from './views/OKRsView'
import OzView from './views/OzView'
import MemoView from './views/MemoView'
import PropView from './views/PropView'
import PipView from './views/PipView'
import NaraView from './views/NaraView'
import AriaView from './views/AriaView'
import CleoView from './views/CleoView'
import ErrorsView from './views/ErrorsView'
import StubView from './views/StubView'

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard"   element={<CommandCenter />} />
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
        <Route path="/memo"        element={<MemoView />} />
        <Route path="/proposals"   element={<PropView />} />
        <Route path="/prospects"   element={<PipView />} />
        <Route path="/nurture"     element={<NaraView />} />
        <Route path="/trends"      element={<AriaView />} />
        <Route path="/cleanup"     element={<CleoView />} />
        <Route path="/automations" element={<StubView title="Automations" />} />
        <Route path="/errors"      element={<ErrorsView />} />
        <Route path="/settings"    element={<StubView title="Settings" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
