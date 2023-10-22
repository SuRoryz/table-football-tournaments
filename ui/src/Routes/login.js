import { useNavigate } from "react-router-dom";
import { Container, Content, Form, Panel, Message, Button, ButtonGroup, useToaster, toaster } from 'rsuite';
import { useState } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import { socket } from '../socket_context/sockets'

export default function Login() {
    const [formValue, setFormValue] = useState({
        uesrname: "",
        password: "",
        role: "user"
      });

    const n = useNavigate();

    const navigator = (data) => {
      socket.emit("unsub_all")
      socket.emit("listen_for", {room: data})
      n(data)
  }

  const toaster = useToaster();

  const statusToType = {
    1: 'success',
    0: 'error',
    2: 'warning',
  }

    function sendFormLogin(form) {
        fetch(`/api/login`, {
          body: JSON.stringify(form),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST"
        }).then(data => data.status == 200 ? data.json() : null).then(
          data => {
            if ('status' in data && 'message' in data) {
              toaster.push(
                <Message showIcon type={statusToType[data.status]}>
                  {data.message}
                </Message>,
                { placement: 'bottomEnd'}
              )
            }

            if (data.status) {
              navigator('/profile')
            }
          }
        )
      }

    return (
    <Container>
        <Content>
            <Panel bordered style={{width: "25rem", height: "40rem",
            left: "calc(50vw - 12.5rem)", top: "calc(50vh - 20rem)", position: "absolute" }}>
            <Form fluid layout='vertical' style={{width: "100%", height: "100%", display: 'flex', flexDirection: 'column', justifyContent: "space-between"}}
            formValue={formValue}
            onChange={fm => {console.log(fm); setFormValue(fm)}}>
                <div>
                <Form.Group className="form-group" controlId="username">
                    <Form.ControlLabel className="mg-lf-1">Имя</Form.ControlLabel>
                    <Form.Control name="username"  autoComplete="off"/>
                    <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                </Form.Group>
                <Form.Group className="form-group" typeof="password" controlId="password">
                    <Form.ControlLabel className="mg-lf-1">Пароль</Form.ControlLabel>
                    <Form.Control type="password" autoComplete="off"  name="password" />
                    <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                </Form.Group>
                </div>
                <div style={{height: "20%", display: "flex", flexDirection: "column", justifyContent: "end", alignItems: "center"}}>
                <span style={{marginBottom: "1rem"}}>Нет аккаунта? <a onClick={() => navigator('/register')}>Регистрация</a></span>
                <FormGroup style={{display: 'flex', width: "100%", justifyContent: "space-around"}}>
                    <Button style={{width: "40%"}} appearance="primary" onClick={() => sendFormLogin(formValue, navigator)}>Вход</Button>
                </FormGroup>
                </div>
            </Form>
            </Panel>
        </Content>
    </Container>)
}