import { useNavigate } from "react-router-dom";
import { Container, Content, List, Panel, Tag, Pagination, Slider, InputGroup, DateRangePicker, Drawer, Sidebar, DatePicker, FlexboxGrid, Uploader, useToaster, Stack, Footer, Input, RadioGroup, Radio, Message, SelectPicker, Checkbox, Button, InputNumber } from 'rsuite';
import { useEffect, useState } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import { useParams, useLocation } from 'react-router-dom';
import { socket } from '../socket_context/sockets'

import SearchIcon from '@rsuite/icons/Search';

let timer = null;

export default function Tournaments() {
    const n = useNavigate();

    const location = useLocation();
    const [ rtimer, setTimer ] = useState()
    const navigator = (data) => {
        n(data)
    }

    const [ sendForm, setSendForm ] = useState(false)
    const [ maxPages, setMaxPages ] = useState(0)
    const [tournaments, setTournaments] = useState([])
    const [ me, setMe ] = useState();
    const [ drawerOpen, setDrawerOpen ] = useState(false)
    const [ tournamentForm, setTournamentForm ] = useState({
        max_teams: 8,
        name: "Новый турнир",
        size: "small",
        difficulty: "easy",
        start_date: 999999999999999,
        win_score: 7,
        cover: null
    });
    const [searchFilters, setFilters] = useState({
        page: 1,
        count: 10,
        query: "",
        size: "all",
        difficulty: "all",
        date: "all",
        only_mine: false,
        i_org: false,
        sort_by: "name",
        order: "asc"
    });

    const toaster = useToaster();

    const statusToType = {
      1: 'success',
      0: 'error',
      2: 'warning',
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

    const statusToColor = {
        "open": "green",
        "active": "yellow",
        "closed": "red"
    }

    const sendTimeout = () => {
        if (timer) {
            clearTimeout(timer)
        }

        timer = setTimeout(() => {
            console.log(1)
            getTours()
        }, 500)
    }

    const getTours = () => {
        fetch(`/api/getTournaments`, {
            method: "POST",
            body: JSON.stringify({...searchFilters}),
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if (!data.result) { return }

                    setTournaments(data.result)
                    setMaxPages(data.count)
                }
            ).catch(err => console.log(err))
    }

    const getMe = () => {
        fetch(`/api/getMe`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
              },
            } ).then(data => data.status == 200 ? data.json() : null).then(
                data => {
                    if (!data.result) { return }
                    setMe(data.result)
                })
            }

    const createTournament = () => {
        fetch('/api/tour/create_tournament',
        {body: JSON.stringify({...tournamentForm}),
        method: "POST",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
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

    useEffect(() => {
    socket.emit("unsub_all")
    socket.emit("listen_for", {room: location.pathname})
     socket.on('ping', () => {
        getTours()
     })   
    }, [])

    useEffect(() => {
        getTours()
        getMe()
    }, [])

    useEffect(() => {
        if (sendForm) {
            setSendForm(false)
            getTours()
        }
    }, [sendForm])

    useEffect(() => {
        
    }, [tournaments, maxPages, rtimer])
    
    useEffect(() => {
        console.log(searchFilters)
    }, [searchFilters])

    return (
        <Container>
            <Sidebar>
                {me && me.role == "org" && 
                    <div style={{padding: "1rem"}}>
                        <Button onClick={() => setDrawerOpen(true)} block appearance="primary">Создать турнир</Button>
                        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} size="sm">
                            <Drawer.Header>
                                <Drawer.Title>Создание турнира</Drawer.Title>
                                <Drawer.Actions>
                                    <Button onClick={() => setDrawerOpen(false)}>Отмена</Button>
                                    <Button onClick={() => {
                                        createTournament()
                                        setDrawerOpen(false)
                                        }} appearance="primary">
                                    Создать
                                    </Button>
                                </Drawer.Actions>
                            </Drawer.Header>
                            <Drawer.Body>
                                <div className="tour-search">
                                    <Input value={tournamentForm.name} onChange={(e) => {
                                        setTournamentForm({...tournamentForm, name: e})
                                    }} placeholder={"Название"} />
                                </div>
                                <div className="tour-search">
                                    <div style={{display: "flex", justifyContent: "start", paddingBlock: "1rem"}}>
                                        <span style={{fontSize: "0.8rem"}}>Максимум команд: {tournamentForm.max_teams}</span>
                                    </div>
                                    <Slider defaultValue={8} max={32} value={tournamentForm.max_teams} progress onChange={(e) => {
                                            setTournamentForm({...tournamentForm, max_teams: e})
                                        }}/>
                                </div>
                                <div className="tour-search" style={{marginTop: "1rem"}}>
                                    <RadioGroup inline appearance="picker" style={{width: "100%", justifyContent: "space-between"}} value={tournamentForm.size} onChange={(e) => setTournamentForm({...tournamentForm, size: e})}>
                                        <div style={{display: "flex", justifyContent: "start", paddingInline: "1rem", alignItems: "center"}}>
                                            <span style={{fontSize: "0.8rem"}}>Размер</span>
                                        </div>
                                        <div>
                                            <Radio value={"small"}>Малый</Radio>
                                            <Radio value={"medium"}>Обычный</Radio>
                                            <Radio value={"big"}>Крупный</Radio>
                                        </div>
                                        
                                    </RadioGroup>
                                </div>
                                <div className="tour-search">
                                    <RadioGroup inline appearance="picker" style={{width: "100%", justifyContent: "space-between"}} value={tournamentForm.difficulty} onChange={(e) => setTournamentForm({...tournamentForm, difficulty: e})}>
                                        <div style={{display: "flex", justifyContent: "start", paddingInline: "1rem", alignItems: "center"}}>
                                            <span style={{fontSize: "0.8rem"}}>Сложность</span>
                                        </div>
                                        <div>
                                            <Radio value={"easy"}>Легкие</Radio>
                                            <Radio value={"medium"}>Продвинутые</Radio>
                                            <Radio value={"hard"}>Сложные</Radio>
                                        </div>
                                        
                                    </RadioGroup>
                                </div>
                                <div className="tour-search" style={{marginTop: "1rem", display: "flex", alignItems: "center", width: "100%"}}>
                                    <span style={{width: "20%"}}>Дата начала</span>
                                    <DatePicker onChange={(e) => {
                                        setTournamentForm({...tournamentForm, start_date: e.getTime() / 1000})
                                    }} style={{width: "80%"}} oneTap format="yyyy-MM-dd" />
                                </div>
                                <div className="tour-search" style={{display: "flex", alignItems: "center", width: "100%"}}>
                                    <span style={{width: "20%"}}>Счёт для победы</span>
                                    <InputNumber value={tournamentForm.win_score} onChange={(e) => {
                                        setTournamentForm({...tournamentForm, win_score: e})
                                    }} style={{width: "80%"}} block />
                                </div>
                                <Uploader action="/api/upload_cover" withCredentials accept="image/*" draggable onSuccess={(e) => {
                                    setTournamentForm({...tournamentForm, cover: e.result})
                                }}>
                                    <div style={{marginTop: "1rem", height: "10rem", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span>Кликните или перетащите изображение, чтобы загрузить обложку</span>
                                    </div>
                                </Uploader>
                            </Drawer.Body>
                        </Drawer>
                    </div>
                }
                <Panel header={"Фильтры"} collapsible defaultExpanded>
                    <div className="tour-search">
                        <InputGroup>
                            <Input value={searchFilters.query} onChange={(e) => {
                                setFilters({...searchFilters, query: e})
                                sendTimeout()
                            }} placeholder={"Поиск"} />
                            <InputGroup.Addon>
                            <SearchIcon />
                            </InputGroup.Addon>
                        </InputGroup>
                    </div>
                    <div className="tour-search">
                        <div style={{display: "flex", justifyContent: "start", paddingBlock: "1rem"}}>
                            <span style={{fontSize: "0.8rem"}}>Количество на странице: {searchFilters.count}</span>
                        </div>
                        <Slider defaultValue={10} max={50} value={searchFilters.count} progress onChange={(e) => {
                                setFilters({...searchFilters, count: e})
                                sendTimeout()
                            }}/>
                    </div>
                    <div className="tour-search">
                        <div style={{display: "flex", justifyContent: "start", paddingBlock: "1rem"}}>
                            <span style={{fontSize: "0.8rem"}}>Размер</span>
                        </div>
                        <SelectPicker searchable={false} block
                        value={searchFilters.size}
                        defaultValue="all"
                        onChange={(e) => {
                            setFilters({...searchFilters, size: e})
                            setSendForm(true)
                        }}
                        data={[{label: "Все", value: "all"}, {label: "Малый", value: "small"}, {label: "Обычный", value: "medium"}, {label: "Крупный", value: "big"}]} />
                    </div>
                    <div className="tour-search">
                        <div style={{display: "flex", justifyContent: "start", paddingBlock: "1rem"}}>
                            <span style={{fontSize: "0.8rem"}}>Сложность</span>
                        </div>
                        <SelectPicker searchable={false} block
                        defaultValue="all"
                        value={searchFilters.difficulty}
                        onChange={(e) => {
                            setFilters({...searchFilters, difficulty: e})
                            setSendForm(true)
                        }}
                        data={[{label: "Все", value: "all"}, {label: "Легкие", value: "easy"}, {label: "Продвинутые", value: "medium"}, {label: "Опытные", value: "hard"}]} />
                    </div>
                    <div className="tour-search">
                        <div style={{display: "flex", justifyContent: "start", paddingBlock: "1rem"}}>
                            <span style={{fontSize: "0.8rem"}}>Дата проведения</span>
                        </div>
                        <DateRangePicker onChange={(e) => {
                            setFilters({...searchFilters, date: [e[0].getTime() / 1000, e[1].getTime() / 1000]})
                            setSendForm(true)
                        }} onClean={() => {
                            setFilters({...searchFilters, date: "all"})
                            setSendForm(true)
                        }} ranges={[]} showOneCalendar />
                    </div>
                    <div className="tour-search">
                        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", paddingBlock: "1rem"}}>
                            <span style={{fontSize: "1rem"}}>Я зарегестрирован</span><Checkbox checked={searchFilters.only_mine}
                            onChange={(e) => {
                                setFilters({...searchFilters, only_mine: !searchFilters.only_mine})
                                setSendForm(true)
                            }} />
                        </div>
                        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", paddingBlock: "1rem"}}>
                            <span style={{fontSize: "1rem"}}>Я организатор</span><Checkbox checked={searchFilters.i_org}
                                onChange={(e) => {setFilters({...searchFilters, i_org: !searchFilters.i_org})
                                setSendForm(true)
                            }} />
                        </div>
                    </div>
                    <div className="tour-search">
                        <RadioGroup inline appearance="picker" style={{width: "100%"}} value={searchFilters.sort_by} onChange={(e) => {setFilters({...searchFilters, sort_by: e}); setSendForm(true)}}>
                            <div style={{display: "flex", justifyContent: "start", paddingInline: "0.5rem", alignItems: "center"}}>
                                <span style={{fontSize: "0.8rem"}}>Сортировка</span>
                            </div>
                            <Radio value={"date"}>Дата</Radio>
                            <Radio value={"name"}>Название</Radio>
                        </RadioGroup>
                    </div>
                    <div className="tour-search">
                        <RadioGroup inline appearance="picker" style={{width: "100%"}} value={searchFilters.order} onChange={(e) => {setFilters({...searchFilters, order: e}); setSendForm(true)}}>
                            <div style={{display: "flex", justifyContent: "start", paddingInline: "0.5rem", alignItems: "center"}}>
                                <span style={{fontSize: "0.8rem"}}>Порядок</span>
                            </div>
                            <Radio value={"desc"}>Убыв.</Radio>
                            <Radio value={"asc"}>Возр.</Radio>
                        </RadioGroup>
                    </div>
                    <div className="tour-search" style={{marginTop: "1rem"}}>
                        <Button onClick={getTours} appearance="primary" block>
                            Поиск
                        </Button>
                    </div>
                </Panel>
            </Sidebar>
            <Content style={{height: "calc(100vh - 5rem)", overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
                <List hover>
                    {tournaments.map((tour) => {
                        return (
                            <List.Item onClick={() => {
                                navigator("/tour/" + tour.id)
                            }}>
                                <FlexboxGrid justify="space-between" className="tournament-item">
                                    <FlexboxGrid.Item className="tour-item-first">
                                        <img style={{objectFit: "cover"}} src={tour.cover} className="tour-image" />
                                        <Stack className="tour-item-meta" direction="column" justifyContent="space-between" alignItems="flex-start">
                                            <span className="tour-name">{tour.name} ({tour.players}) <span style={{paddingLeft: "1rem", color: "var(--rs-gray-300"}}>{tour.i_in ? "Учавствую" : ""}</span></span>
                                            <div className="tour-difficulty">
                                                <span style={{marginRight: "1rem"}}>Сложность:</span>
                                                <Tag color={diffToColor[tour.difficulty]} >{diffToName[tour.difficulty]}</Tag>
                                            </div>
                                        </Stack>
                                    </FlexboxGrid.Item>
                                    <FlexboxGrid.Item className="tour-item-last">
                                        <Stack className="tour-item-meta-last" direction="column" justifyContent="space-between" alignItems="end" style={{paddingRight: "1rem"}}>
                                            <span>
                                                <Tag style={{marginRight: "1rem", textTransform: "uppercase"}} color={statusToColor[tour.status]}>{tour.status}</Tag>
                                                <span>{ tour.status == "closed" ? "Турнер закрыт" :
                                                        tour.start_date > 99999999999 ? "Анонс" : 
                                                        tour.start_date - new Date().getTime() / 1000 < 86400 ? "До начала: " + (
                                                            new Date(tour.start_date - new Date().getTime() / 1000).toLocaleTimeString()
                                                        )
                                                        : "Начало: " + new Date(tour.start_date * 1000).toLocaleString()}</span>
                                            </span>
                                            <span>{sizeToName[tour.size]}</span>
                                        </Stack>
                                    </FlexboxGrid.Item>
                                </FlexboxGrid>
                            </List.Item>
                        )
                        })
                    }
                </List>
                <Footer style={{display: "flex", justifyContent: "center", padding: "1rem"}}>
                    {
                        maxPages && maxPages > 1 &&
                        <Pagination total={maxPages} limit={searchFilters.count} activePage={searchFilters.page} onChangePage={(e) => {
                            setFilters({...searchFilters, page: e})
                            setSendForm(true)
                        }} />
                    }
                </Footer>
            </Content>
        </Container>
    )
}