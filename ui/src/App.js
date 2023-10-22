import logo from './logo.svg';
import './App.css';
import 'rsuite/dist/rsuite.min.css';

import { useState } from 'react'
import { Container, Content, Form, Panel, Radio, RadioGroup, Button, ButtonGroup, Header, Sidebar, Footer, Nav, Navbar, Stack, Placeholder, PanelGroup } from 'rsuite';
import { Routes, Route, BrowserRouter } from "react-router-dom";
import FormGroup from 'rsuite/esm/FormGroup';
import Login from './Routes/login'
import Register from './Routes/register'
import Profile from './Routes/profile';
import Tournaments from './Routes/tournaments'
import Tour from './Routes/tour'
import NV from './Routes/navbar'
import HomeIcon from '@rsuite/icons/legacy/Home';
import { socket } from './socket_context/sockets';

function App() {
  const p = (
    <NV>
      <Profile />
    </NV>
  )

  const t = (
    <NV>
      <Tournaments />
    </NV> 
  )

  const tz = (
    <NV>
      <Tour />
    </NV>  
  )

  return (
    <div className='App'>
      <div className='AppWrapper'>
        <BrowserRouter >
          <Routes>
            <Route path="/" element={
              <Login/> }>  
            </Route>
            <Route path="/login" element={
              <Login/> }>
            </Route>
            <Route path="/register" element={
              <Register/>
                }>
            </Route>
            <Route path="/profile/:userId" element={
              p
                }>
            </Route>
            <Route path="/profile" element={
              p
                }>
            </Route>
            <Route path="/tournaments" element={
              t
                }>
            </Route>
            <Route path="/tour/:tourId" element={
              tz
                }>
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
}

export default App;
