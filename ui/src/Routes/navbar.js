
import { useNavigate } from "react-router-dom";
import { Container, Navbar, Header, Footer, Nav, RadioGroup, Button, ButtonGroup, useToaster } from 'rsuite';
import { useState } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import HomeIcon from '@rsuite/icons/legacy/Home';
import { socket } from '../socket_context/sockets'

export default function NV({ children }) {
    const n = useNavigate();

    const navigator = (data) => {
        socket.emit("unsub_all")
        socket.emit("listen_for", {room: data})
        n(data)
    }

    return (
        <Container>
            <Header>
                <Navbar>
                <Navbar.Brand href="#">BENZOVOZ</Navbar.Brand>
                <Nav>
                    <Nav.Item icon={<HomeIcon />} onClick={() => navigator('/profile')}>Профиль</Nav.Item>
                    <Nav.Item onClick={() => navigator('/tournaments')}>Турниры</Nav.Item>
                </Nav>
                <Nav pullRight>
                    <Nav.Item onClick={() => {fetch('/api/logout',
                        {credentials: 'include',
                            method: "POST"
                        });
                        navigator("/login")}
                    }>Выйти</Nav.Item>
                </Nav>
                </Navbar>
            </Header>
             {children}
            <Footer>

            </Footer>
        </Container> 
    )
}