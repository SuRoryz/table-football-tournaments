import { useNavigate } from "react-router-dom";
import { Container, Content, Form, Panel, Radio, RadioGroup, Button, Message, useToaster } from 'rsuite';
import { useState } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import { socket } from '../socket_context/sockets'



export default function Register() {
    const [formValue, setFormValue] = useState({
        uesrname: "",
        password: "",
        role: "user"
      });

    const n = useNavigate();

    const toaster = useToaster();

    const statusToType = {
      1: 'success',
      0: 'error',
      2: 'warning',
    }

    const navigator = (data) => {
      socket.emit("unsub_all")
      socket.emit("listen_for", {room: data})
      n(data)
  }
  function sendFormRegister(form) {
      fetch(`/api/register`, {
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
            navigator('/login')
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
                          <Form.Control autoComplete="off" name="username" />
                          <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                        </Form.Group>
                        <Form.Group className="form-group" controlId="password">
                          <Form.ControlLabel className="mg-lf-1">Пароль</Form.ControlLabel>
                          <Form.Control type="password" autoComplete="off" name="password" />
                          <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                        </Form.Group>
                        <Form.Group className="form-group" controlId="role">
                          <RadioGroup style={{width: "100%", display: "flex", justifyContent: "space-between"}} name="role" inline appearance="picker" defaultValue="user" onChange={(e) => {setFormValue({...formValue, role: e})}}>
                            <span style={{padding: '7px 2px 7px 12px',display: 'inline-block',verticalAlign: 'middle'}}>Выберите роль: </span>
                            <div>
                              <Radio value="user">Участник</Radio>
                              <Radio value="org">Организатор</Radio>
                            </div>
                          </RadioGroup>
                        </Form.Group>
                      </div>
                      <div style={{height: "20%", display: "flex", flexDirection: "column", justifyContent: "end", alignItems: "center"}}>
                        <span style={{marginBottom: "1rem"}}>Уже зарегестрированы? <a onClick={() => navigator('/')}>Войти</a></span>
                        <FormGroup style={{display: 'flex', width: "100%", justifyContent: "space-around"}}>
                            <Button style={{width: "40%"}} appearance="primary" onClick={() => sendFormRegister(formValue, navigator)}>Регистрация</Button>
                        </FormGroup>
                      </div>
                    </Form>
                  </Panel>
                </Content>
              </Container>
    )
}