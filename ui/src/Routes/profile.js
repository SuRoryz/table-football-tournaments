import { useNavigate } from "react-router-dom";
import { Container, Content, Drawer, Panel, Input, Uploader, Button, ButtonGroup, Loader, Message, Sidebar, PanelGroup, FlexboxGrid, useToaster, Tag, Stack, List, IconButton } from 'rsuite';
import { useEffect, useState } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import { useParams, useLocation  } from 'react-router-dom';
import { socket } from '../socket_context/sockets'
import FlexboxGridItem from "rsuite/esm/FlexboxGrid/FlexboxGridItem";
import EmailIcon from '@rsuite/icons/Email';

let timer = 0;

export default function Profile() {
    const n = useNavigate();
    const toaster = useToaster();

    const [uploading, setUploading] = useState(false);
    const [fileInfo, setFileInfo] = useState(null);
    const [userInfo, setUserInfo] = useState();
    const { userId } = useParams();
    const [openTeam, setOpenTeam] = useState(false);
    const [openTeamFind, setOpenTeamFind] = useState(false);
    const [openTeamInvite, setOpenTeamInvite] = useState(false);
    const [createTeamForm, setCreateTeamForm] = useState({
        name: ""
    })
    const [inviteTeamForm, setInviteTeamForm] = useState({
        user_id: ""
    })
    const [ profileWindow, setProfileWindow ] = useState("team");

    const [ usersToInvite, setUsersToInvite ] = useState([])

    const navigator = (data) => {
        n(data)
    }

    const statusToType = {
      1: 'success',
      0: 'error',
      2: 'warning',
    }

    const location = useLocation();

    useEffect(() => {
        socket.emit("unsub_all")
        socket.emit("listen_for", {room: location.pathname})
        socket.on('ping', () => {
            if (!userId ) {
                getMe()
            } else  {
                getUser(userId)
            }
        })
    }, [])

    const [ userTours, setUserTours ] = useState([])
    const [ userToursOfsset, setUserToursOffser ] = useState(0)
    
    const getUserTours = () => {
        fetch(`/api/tour/get_for_user`, {
            method: "POST",
            body: JSON.stringify({offset: userToursOfsset, user_id: userInfo.id}),
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
        }).then(data => data.status == 200 ? data.json() : null).then(
            data => {
                if (!data.result) { return }
                setUserTours(data.result)
            }
        )
    }

    const createTeam = () => {
        fetch(`/api/team/create_team/${createTeamForm.name}`, {
        method: "POST",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json",
        },
        } ).then(data => data.status == 200 ? data.json() : null).then(
            data => {
                if ('status' in data && 'message' in data) {
                    toaster.push(
                      <Message showIcon type={statusToType[data.status]}>
                        {data.message}
                      </Message>,
                      { placement: 'bottomEnd'}
                    )
                  }
            }
        )
    }

    const acceptInvite = (id) => {
        fetch(`/api/team/accept_invite/${id}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if ('status' in data && 'message' in data) {
                        toaster.push(
                          <Message showIcon type={statusToType[data.status]}>
                            {data.message}
                          </Message>,
                          { placement: 'bottomEnd'}
                        )
                      }
                }
            )
    }

    const previewFile = (file, callback) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          callback(reader.result);
        };
        reader.readAsDataURL(file);
      }

    const declineInvite = (id) => {
        fetch(`/api/team/decline_invite/${id}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if ('status' in data && 'message' in data) {
                        toaster.push(
                          <Message showIcon type={statusToType[data.status]}>
                            {data.message}
                          </Message>,
                          { placement: 'bottomEnd'}
                        )
                      }
                }
            )
    }

    const leaveTeam = () => {
        fetch(`/api/team/leave`, {
            method: "POST",
            body: JSON.stringify({userId}),
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if ('status' in data && 'message' in data) {
                        toaster.push(
                          <Message showIcon type={statusToType[data.status]}>
                            {data.message}
                          </Message>,
                          { placement: 'bottomEnd'}
                        )
                      }
            })
    }

    const queryInvite = (query) => {
        fetch(`/api/team/query_invite/${query}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if ('status' in data && 'message' in data) {
                        toaster.push(
                          <Message showIcon type={statusToType[data.status]}>
                            {data.message}
                          </Message>,
                          { placement: 'bottomEnd'}
                        )
                      }

                    if (!data.result) { return }
                    setUsersToInvite(data.result)
                }
            )
    }

    const doInvite = (userId) => {
        fetch(`/api/team/invite/${userId}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if ('status' in data && 'message' in data) {
                        toaster.push(
                          <Message showIcon type={statusToType[data.status]}>
                            {data.message}
                          </Message>,
                          { placement: 'bottomEnd'}
                        )
                      }

                    if (!data.result) { return }
                    setUsersToInvite(data.result)
                }
            )
    }

    const getMe = () => {
        fetch(`/api/getMe`, {
            method: "POST",
            mode: "cors",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if (!data.result) { return }

                    setUserInfo(data.result)
                }
            )
    }

    const getUser = (userId) => {
        fetch(`/api/getUser/${userId}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if (!data.result) { return }

                    setUserInfo(data.result)
                }
            )
    }

    useEffect(() => {

    }, [profileWindow, userTours])

    useEffect(() => {
        if (userInfo) {
            getUserTours() 
        }
       
    }, [userInfo])

    useEffect(() => {
        if (!userId) {
            getMe()
        } else {
            getUser(userId)
        }
    }, [])

    return (
        userInfo &&
            <Container>
                <Sidebar>
                <PanelGroup accordion>
                    { !userId ?
                    <Panel header={"Приглашения"} collapsible defaultExpanded>
                        {
                            userInfo.invites && userInfo.invites.map(invite => 
                                invite &&
                                <Panel header={invite.team_name} bordered key={invite.id} collapsible>
                                    <ButtonGroup>
                                        <Button onClick={() => declineInvite(invite.id) }>Отклонить</Button>
                                        <Button appearance="primary" onClick={() => acceptInvite(invite.id) } disabled={userInfo.team}>Принять</Button>
                                    </ButtonGroup>
                                </Panel>
                            )
                        }
                    </Panel> : null}
                    <Panel style={{height: "calc(100vh - 10rem)", display: "flex", flexDirection: "column", overflowY: "auto"}} header={"Последние матчи"} collapsible defaultExpanded>
                        <List>
                        { 
                            userInfo.matches && userInfo.matches.map(match =>
                                <span className="last-matches-wrapper" onClick={() => navigator("/tour/" + match.tournament)}>
                                    <span className="last-matches-score">
                                        <span className="last-matches-score-value">{match.score}</span>
                                    </span>
                                    <span className="last-matches-names-wrapper">
                                        <span className="last-matches-names">{match.T1}</span>
                                        vs
                                        <span className="last-matches-names">{match.T2}</span>
                                    </span>
                                </span>
                            )
                        }
                        </List>
                    </Panel>
                </PanelGroup>
                </Sidebar>
                <Content>
                    <Panel style={{width: "100%"}}>
                        <FlexboxGrid>
                            { userId ?
                                <img className="bd-r" src={"/" + userInfo.cover} style={{height: "15rem", width: "10rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}}/>
                            :   <Uploader
                                    fileListVisible={false}
                                    listType="picture"
                                    action={"/api/upload_cover/user_" + userInfo.id}
                                    withCredentials
                                    onUpload={file => {
                                        setUploading(true);
                                        previewFile(file.blobFile, value => {
                                            setFileInfo(value);
                                        });
                                    }}
                                    onSuccess={(response, file) => {
                                        setUploading(false);
                                        toaster.push(<Message type="success">Uploaded successfully</Message>);
                                    }}
                                    onError={() => {
                                        setFileInfo(null);
                                        setUploading(false);
                                        toaster.push(<Message type="error">Upload failed</Message>);
                                    }}
                                >
                                    <button style={{ width: "fit-content", height: "fit-content" }}>
                                    {uploading && <Loader backdrop center />}
                                    {fileInfo ? (
                                        <img src={fileInfo} style={{height: "15rem", width: "10rem", objectFit: "cover"}} />
                                    ) : (
                                        <img className="bd-r" src={"/" + userInfo.cover} style={{height: "15rem", width: "10rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}}/>
                                    )}
                                    </button>
                                </Uploader>
                            }  
                            <Panel className="sm_header" header={
                                <span style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: "2rem", fontWeight: "bold", color: "#929a9e"}}>
                                    {userInfo.username} #{userInfo.id}
                                    <ButtonGroup>
                                        <Button disabled={profileWindow == "team"} onClick={() => {
                                            setProfileWindow("team")
                                        }}>Команда</Button>
                                        <Button disabled={profileWindow == "tours"} onClick={() => {
                                            setProfileWindow("tours")
                                        }}>История турниров</Button>
                                    </ButtonGroup>
                                </span>
                                } style={{width: "calc(100% - 11rem)"}}>
                                <hr/>
                                <Stack direction="column" spacing={5} className="wd100">
                                    <Stack.Item className="wd100">
                                        <FlexboxGrid dir="row" justify="space-between">
                                            <FlexboxGrid.Item>
                                                Текущая команда
                                            </FlexboxGrid.Item>
                                            <FlexboxGrid.Item>
                                                {userInfo.team ? userInfo.team.name : null}
                                            </FlexboxGrid.Item>
                                        </FlexboxGrid>
                                    </Stack.Item>
                                    <Stack.Item className="wd100">
                                        <FlexboxGrid dir="row" justify="space-between">
                                            <FlexboxGrid.Item>
                                                Игр всего
                                            </FlexboxGrid.Item>
                                            <FlexboxGrid.Item>
                                                {userInfo ? userInfo.all_games : null}
                                            </FlexboxGrid.Item>
                                        </FlexboxGrid>
                                    </Stack.Item>
                                    <Stack.Item className="wd100">
                                        <FlexboxGrid dir="row" justify="space-between">
                                            <FlexboxGrid.Item>
                                                Побед
                                            </FlexboxGrid.Item>
                                            <FlexboxGrid.Item>
                                                {userInfo ? userInfo.wins : null}
                                            </FlexboxGrid.Item>
                                        </FlexboxGrid>
                                    </Stack.Item>
                                </Stack>
                            </Panel>
                        </FlexboxGrid>
                    </Panel>
                    <Panel className="pn-bd-align">
                        <Drawer open={openTeam} onClose={() => setOpenTeam(false)}>
                            <Drawer.Header>
                            <Drawer.Title>Создать команду</Drawer.Title>
                            <Drawer.Actions>
                                <Button onClick={() => setOpenTeam(false)}>Отмена</Button>
                                <Button onClick={() => {
                                    createTeam()
                                    setOpenTeam(false)
                                }} appearance="primary">
                                Готово
                                </Button>
                            </Drawer.Actions>
                            </Drawer.Header>
                            <Drawer.Body>
                                <div className="tour-search">
                                    <Input value={createTeamForm.name} onChange={(e) => {
                                        setCreateTeamForm({...createTeamForm, name: e})
                                    }} placeholder={"Название команды"} />
                                </div>
                            </Drawer.Body>
                        </Drawer>
                        <Drawer open={openTeamInvite} onClose={() => setOpenTeamInvite(false)}>
                            <Drawer.Header>
                            <Drawer.Title>Пригласить в команду</Drawer.Title>
                            <Drawer.Actions>
                                <Button onClick={() => setOpenTeamInvite(false)}>Отмена</Button>
                                <Button onClick={() => {
                                        queryInvite(inviteTeamForm.user_id)
                                        setOpenTeamInvite(false)
                                }} appearance="primary">
                                Пригласить
                                </Button>
                            </Drawer.Actions>
                            </Drawer.Header>
                            <Drawer.Body>
                                <div className="tour-search">
                                    <Input value={inviteTeamForm.user_id} onChange={(e) => {
                                        if (timer) { clearTimeout(timer) }
                                        
                                        setInviteTeamForm({...inviteTeamForm, user_id: e})

                                        timer = setTimeout(() => {
                                            queryInvite(e)
                                        }, 500)
                                    }} placeholder={"Введите ID пользователя"} />
                                </div>

                                <List bordered hover style={{marginTop: "1rem", cursor: "pointer"}}>
                                    {usersToInvite && usersToInvite.map(user => (
                                        <List.Item key={user.id} onClick={() => {
                                            doInvite(user.id);
                                            setOpenTeamInvite(false)
                                        }}>
                                            <FlexboxGrid style={{width: "100%"}} dir="row" align="center" justify="space-between">
                                                <FlexboxGrid.Item style={{display: "flex", alignItems: "center"}}>
                                                    <img src={"/" + user.cover} className="bd-r" style={{height: "3rem", width: "3rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}} />
                                                    <span style={{marginLeft: "1rem", fontSize: "1.2rem"}}>{user.name}</span>
                                                </FlexboxGrid.Item>
                                                <FlexboxGridItem style={{display: "flex", alignItems: "center"}}>
                                                    <IconButton icon={<EmailIcon />} appearance="subtle" onClick={() => {
                                                        
                                                    }} />
                                                </FlexboxGridItem>
                                            </FlexboxGrid>
                                        </List.Item>
                                    ))}
                                </List>
                            </Drawer.Body>
                        </Drawer>
                        { profileWindow == "team" ? (
                            <>
                            {   userInfo.team ?
                                    <Panel style={{width: "100%"}} bordered>
                                    <div style={{display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: "center", width: "100%"}}>
                                        <span style={{padding: "1rem", fontSize: "1.5rem", width: "100%", paddingTop: 0, display: "flex", justifyContent: "space-between", alignContent: "center"}}>
                                            <span>Команда {userInfo.team.name}</span>
                                            {   !userId &&
                                                (userInfo.team.cap != userInfo.id ?
                                                <Button onClick={leaveTeam}>Выйти</Button> :
                                                <Button appearance="ghost" color="red" onClick={leaveTeam}>Распустить</Button>
                                                )
                                            }
                                        </span>
                                        <div style={{display: "flex", flexDirection: "row", justifyContent: "space-around", alignItems: "center", width: "100%", paddingTop: "0.5rem"}}>
                                            { userInfo.team.members.map(user => {
                                            return (
                                                <div onClick={() => navigator(`/profile/${user.id}`)} style={{display: "flex", flexDirection: "column", cursor: "pointer"}}>
                                                    <img className="bd-r" style={{height: "7.5rem", width: "7.5rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}} src={"/" + user.cover}/>
                                                    <span style={{paddingTop: "1rem", fontSize: "1.5rem"}}>{user.username}</span>
                                                </div>
                                                )
                                                })
                                            }
                                            { !userId && userInfo.team.members.length < 2 ?
                                            <div onClick={() => setOpenTeamInvite(true)} style={{display: "flex", flexDirection: "column", cursor: "pointer"}}>
                                                <img className="bd-r" style={{height: "7.5rem", width: "7.5rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}} src={"/add_user_placeholder.png"}/>
                                                <span style={{paddingTop: "1rem", fontSize: "1.5rem"}}>Пригласить</span>
                                            </div> : null
                                            }
                                        </div>
                                    </div>
                                    </Panel> :
                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <span style={{padding: "1rem", paddingTop: 0, fontSize: "1.5rem"}}>Вы не в команде!</span>
                                    <div style={{width: "25rem", display: "flex", justifyContent: "space-around", alignItems: "center"}}>
                                        <Button onClick={() => setOpenTeam(true)}>
                                            Создать команду
                                        </Button>
                                        или дождитесь приглашения
                                    </div>
                                </div>
                            }</>)
                            :
                            <List bordered hover className="wd100" style={{cursor: "pointer"}}>
                                {
                                    userTours.map(tour => {
                                        return <List.Item onClick={() => navigator(`/tour/${tour.id}`)} style={{width: "100%", height: "7rem"}} key={tour.id}>
                                            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%"}}>
                                                <div>
                                                    <img src={"/" + tour.cover} className="bd-r" style={{height: "5rem", width: "5rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}} />
                                                    <span style={{marginLeft: "1rem", fontSize: "1.2rem", fontWeight: "bold"}}>{tour.name}</span>
                                                </div>
                                                <div>
                                                    {tour.winner == userInfo.id ?
                                                    <Tag color="green" size="lg">Победа</Tag> : <Tag color="red" size="lg">Поражение</Tag>}
                                                </div>
                                            </div>
                                        </List.Item>
                                    })
                                }
                            </List>
                        }
                    </Panel>
                </Content>
            </Container>
    )
}