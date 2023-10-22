import { useNavigate } from "react-router-dom";
import { Container, Content, Nav, Panel, Tag, Button, useToaster, Message, Loader, FlexboxGrid, Uploader, Badge, Stack, Table, InputNumber } from 'rsuite';
import { useEffect, useState } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import { useParams, useLocation } from 'react-router-dom';
import { SingleEliminationBracket, Match, MATCH_STATES, SVGViewer } from '@g-loot/react-tournament-brackets';
import { useWindowSize } from "@uidotdev/usehooks";
import AvatarIcon from '@rsuite/icons/legacy/Avatar';
import { socket } from '../socket_context/sockets'

export default function Tour() {
    const n = useNavigate();

    const navigator = (data) => {
        n(data)
    }

    const location = useLocation();
    const { tourId } = useParams();
    const toaster = useToaster();
    const [ active, setActive ] = useState("info");
    const [ tour, setTour ] = useState();

    const [uploading, setUploading] = useState(false);
    const [fileInfo, setFileInfo] = useState(null);

    const statusToType = {
        1: 'success',
        0: 'error',
        2: 'warning',
      }

    const roundToText = {
        1: "Финал",
        2: "Полуфинал",
        3: "Четвертьфинал"
    }

    const diffToColor = {
        "hard": "red",
        "medium": "yellow",
        "easy": "green"
    }

    const diffToName = {
        "hard": "Опытные",
        "medium": "Продвинутые",
        "easy": "Легкие"
    }

    const sizeToName = {
        "small": "Малый турнир",
        "medium": "Обычный турнир",
        "big": "Крупный турнир"
    }

    function updateScore(match_id, score) {
        fetch(`/api/tour/edit_score`, {
            method: "POST",
            body: JSON.stringify({match_id, score}),
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            }
        })
    }

    function previewFile(file, callback) {
        const reader = new FileReader();
        reader.onloadend = () => {
          callback(reader.result);
        };
        reader.readAsDataURL(file);
      }

    function join() {
        fetch(`/api/tour/join/${tourId}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            }
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
            }
        )
    }

    function reset() {
        fetch(`/api/tour/reset_tournament/${tourId}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            }
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
            }
        )
    }

    function start() {
        fetch(`/api/tour/start/${tourId}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            }
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
            }
        )
    }

    function delete_t () {
        fetch(`/api/tour/delete_tournament/${tourId}`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            }
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
            }
        )
    }

    const getTours = () => {
        fetch(`/api/getTour/${tourId}`, {
        method: "POST",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json",
            },
        } ).then(data => data.status == 200 ? data.json() : null).then(
            data => {
                if (!data.result) { return }

                setTour(data.result)
            }
        ).catch(err => console.log(err))
    }

    useEffect(() => {
        socket.emit("unsub_all")
        socket.emit("listen_for", {room: location.pathname})
        socket.on('ping', () => {
           getTours()
        })
    }, [])

    useEffect(() => {
        socket.off('edit_score');
        socket.on('edit_score', (data) => {
            let match = data.match
            let score = data.score

            let b = structuredClone(tour)

            Object.entries(b.matches).forEach(([key, value]) => {
                value.forEach((v) => {
                    if (v.id == match) {
                        console.log(v.id, match)
                        v.score = score
                    }
                })
            })

            setTour(b);
        })
    }, [tour])

    useEffect(() => {
        getTours()
    }, [])

    const SG = () => (
        <FlexboxGrid  dir="row" justify="space-around" style={{height: "calc(100vh - 15rem)", width: "100%", overflow: "auto"}}>{
            Object.entries(tour.matches).map(
                ([key, value]) => {
                    return (
                        <div style={{display: "flex", flexDirection: "column", justifyContent: "space-around", height: "100%"}}>
                            <span style={{paddingInline: "3rem", paddingBlock: "0.5rem", backgroundColor: "#141822", marginBottom: "1rem", borderRadius: "0.2rem"}}>
                                {roundToText[Object.entries(tour.matches).length - parseInt(key)] ? roundToText[Object.entries(tour.matches).length - parseInt(key)] : "Групповая стадия"}
                            </span>
                            <Stack direction="column" alignItems="center" justifyContent="center" style={{height: "100%"}}>
                                <Stack.Item style={{display: "flex", flexDirection: "column", justifyContent: "space-around", height: "100%"}}>
                                {
                                    value.map((v) => {
                                        return (
                                            <span className="ladder-match">
                                                <Badge content={v.winner == v.T1 ? "winner" : false}>
                                                    <span className={"ladder-match-first " + (v.winner == v.T1 ? "winner" : v.winner == v.T2 ? "loser" : "")}>{v.T1}
                                                        <span className={"ladder-match-score"}>{
                                                            !tour.is_i_org ?
                                                            v.score && v.score.split(":")[0] :
                                                            v.score && <input readOnly={v.score.split(":")[0] == tour.win_score} max={v.win_score} type="number" style={{width: "2.7rem", border: "none", outline: "none", backgroundColor: "transparent"}} onChange={(e) => {
                                                                
                                                                console.log(e)
                                                                updateScore(v.id, e.target.value + ":" + v.score.split(":")[1])
                                                            }} defaultValue={v.score ? v.score.split(":")[0] : 1}/>
                                                            }
                                                        </span>
                                                    </span>
                                                </Badge>
                                                <Badge content={v.winner == v.T2 ? "winner" : false}>
                                                    <span className={"ladder-match-last " + (v.winner == v.T2 ? "winner" : v.winner == v.T1 ? "loser" : "")}>{v.T2}<span className={"ladder-match-score"}>{
                                                        !tour.is_i_org ?
                                                        v.score && v.score.split(":")[1] :
                                                        v.score && <input readOnly={v.score.split(":")[1] == tour.win_score} max={v.win_score} type="number" style={{width: "2.7rem", border: "none", outline: "none", backgroundColor: "transparent"}} onChange={(e) => {
                                                            updateScore(v.id, v.score.split(":")[0] + ":" + e.target.value)
                                                        }} defaultValue={v.score ? v.score.split(":")[1] : 1}/>
                                                    }</span></span>
                                                </Badge>
                                            </span>
                                        )
                                    })
                                }
                                </Stack.Item>
                            </Stack>
                        </div>
                    )
                })
        }</FlexboxGrid>
    )

    return (
        <Container>
            <Content>
                <Panel className="sm_header_bt" style={{height: "100%"}} header={
                    <Nav appearance="subtle" activeKey={active} onSelect={(e) => {setActive(e)}} style={{ marginBottom: 50 }}>
                        <Nav.Item eventKey="info">Информация</Nav.Item>
                        <Nav.Item eventKey="ladder">Сетка</Nav.Item>
                    </Nav>
                }>  
                    {tour && active == "info" &&
                    <FlexboxGrid style={{height: "100%"}} justify="space-between">
                            <Badge content={tour.status}>
                            { !tour.is_i_org ?
                                <img src={"/" + tour.cover} style={{height: "15rem", width: "15rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}}/>
                            :   <Uploader
                                    fileListVisible={false}
                                    listType="picture"
                                    action={"/api/upload_cover/tour_" + tour.id}
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
                                        <img src={"/" + tour.cover} style={{height: "15rem", width: "15rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}}/>
                                    )}
                                    </button>
                                </Uploader>
                            } </Badge>
                            <Panel className="sm_header" header={
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <span style={{display: 'flex', justifyContent: 'center', fontSize: "2rem", fontWeight: "bold", color: "#929a9e"}}>
                                        {tour.name} #{tour.id}
                                    </span>
                                    <div>
                                        {tour.is_i_org &&
                                        <> { tour.status != "active" &&
                                        <Button style={{marginRight: "1rem", width: "7rem"}} appearance="primary" color="green" onClick={start}>
                                            Старт
                                        </Button> }
                                        <Button style={{marginRight: "1rem", width: "7rem"}} appearance="primary" color="red" onClick={reset}>
                                            Ресет
                                        </Button>
                                        <Button style={{marginRight: "1rem", width: "7rem"}} appearance="ghost" color="red" onClick={delete_t}>
                                            Удалить
                                        </Button>
                                        </>
                                        }
                                        <Button onClick={join} disabled={tour.is_i_org || tour.i_in}>
                                            {!tour.is_i_org && !tour.i_in ? "Учавстовать" : "Вы учавствуете"}
                                        </Button>
                                    </div>
                                </div>
                                } style={{width: "calc(100% - 16rem)"}}>
                                <hr/>
                                <Stack direction="column" spacing={20} className="wd100">
                                    <Stack.Item className="wd100">
                                        <FlexboxGrid dir="row" justify="space-between">
                                            <FlexboxGrid.Item>
                                                Соперники
                                            </FlexboxGrid.Item>
                                            <FlexboxGrid.Item>
                                                <Tag color={diffToColor[tour.difficulty]}>{diffToName[tour.difficulty]}</Tag>
                                            </FlexboxGrid.Item>
                                        </FlexboxGrid>
                                    </Stack.Item>
                                    <Stack.Item className="wd100">
                                        <FlexboxGrid dir="row" justify="space-between">
                                            <FlexboxGrid.Item>
                                                Размер
                                            </FlexboxGrid.Item>
                                            <FlexboxGrid.Item>
                                                {sizeToName[tour.size]}
                                            </FlexboxGrid.Item>
                                        </FlexboxGrid>
                                    </Stack.Item>
                                    <Stack.Item className="wd100">
                                        <FlexboxGrid dir="row" justify="space-between">
                                            <FlexboxGrid.Item>
                                                Дата проведения
                                            </FlexboxGrid.Item>
                                            <FlexboxGrid.Item>
                                                {new Date(tour.start_date * 1000).toLocaleString()}
                                            </FlexboxGrid.Item>
                                        </FlexboxGrid>
                                    </Stack.Item>
                                    <Stack.Item className="wd100">
                                        <FlexboxGrid dir="row" justify="space-between">
                                            <FlexboxGrid.Item>
                                                Раундов до победы
                                            </FlexboxGrid.Item>
                                            <FlexboxGrid.Item>
                                                {tour.win_score}
                                            </FlexboxGrid.Item>
                                        </FlexboxGrid>
                                    </Stack.Item>
                                </Stack>
                            </Panel>
                            {
                                    tour.status == "closed" &&
                                    <Panel style={{width: "100%", marginTop: "1rem"}} bordered>
                                        <div style={{display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: "center", width: "100%"}}>
                                            <span style={{padding: "1rem", fontSize: "1.5rem", width: "100%", paddingTop: 0, display: "flex", justifyContent: "space-between", alignContent: "center"}}>
                                                <span>Победитель: команда {tour.winner.name}</span>
                                            </span>
                                            <div style={{display: "flex", flexDirection: "row", justifyContent: "space-around", alignItems: "center", width: "100%", paddingTop: "0.5rem"}}>
                                                { tour.winner.members.map(user => {
                                                return (
                                                    <div onClick={() => navigator(`/profile/${user.id}`)} style={{display: "flex", flexDirection: "column", cursor: "pointer"}}>
                                                        <img className="bd-r" style={{height: "7.5rem", width: "7.5rem", objectFit: "cover", backgroundColor: "var(--rs-avatar-bg)", border: "none"}} src={"/" + user.cover}/>
                                                        <span style={{paddingTop: "1rem", fontSize: "1.5rem"}}>{user.username}</span>
                                                    </div>
                                                    )
                                                    })
                                                }
                                            </div>
                                        </div>
                                    </Panel>
                                }
                        </FlexboxGrid>}
                        {tour && active == "ladder" &&
                            <Panel>
                                <SG/>
                            </Panel>
                        }
                </Panel>
            </Content>
        </Container>
    )
}