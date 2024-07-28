/*eslint-disable*/
import React from "react";
import { Link } from "react-router-dom";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import 'sweetalert2/dist/sweetalert2.min.css';
import banner from '/src/freeserverv3bannerb.png';
import bars from '/src/bars.png'

const MySwal = withReactContent(Swal)

export default function Sidebar() {
  const [collapseShow, setCollapseShow] = React.useState("hidden");
  const [isLoading, setIsLoading] = React.useState(true);
  const [name, setName] = React.useState(String)
  const [user, setUser] = React.useState(String)
  const [pteroUser, setPteroUser] = React.useState(String)
  const [isConnected, setIsConnected] = React.useState(false)

  // React.useEffect(() => {
  //   const webSocketProtocol = window.location.protocol == "https:" ? "wss://" : "ws://";
  //   const ws = new W3CWebSocket(`${webSocketProtocol}${window.location.host}/api/watch`);

  //   ws.onopen = function (event) {
  //     if (isConnected === true) return ws.close()
  //     console.log("Connected to websocket");
  //     setIsConnected(true)
  //   };
  //   ws.onclose = function (event) {
  //     console.log("Disconnected from websocket (Close Event)");
  //     MySwal.fire({
  //       icon: 'error',
  //       title: 'Error',
  //       text: "Cannot contact the backend. Please contact a site administrator.",
  //       confirmButtonText: "Reload Page",
  //     }).then(() => {
  //       window.location.reload()
  //     })
  //   };
  //   ws.addEventListener('message', function (event) {
  //     if (event.data.toString("utf8") === "stay alive pretty please thanks") return
  //     const data = JSON.parse(event.data)
  //     if (data.error) MySwal.fire({
  //       icon: 'error',
  //       title: 'Error',
  //       text: data.error,
  //     })
  //     setUser(data.user)
  //   });
  //   return () => {
  //     console.log("Disconnected from websocket (Page Leave)");
  //     ws.close()
  //   };
  // }, []);

  React.useEffect(() => {
    fetch('/api/getName', {
      credentials: 'include'
    })
      .then(response => response.json())
      .then(json => {
        setName(json.name)
        fetch('/api/me', {
          credentials: 'include'
        })
          .then(response => response.json())
          .then(json => {
            setUser(json.user)
            setPteroUser(json.ptero_user)
            setIsLoading(false)
          })
      })
  }, []);

  return (
    <>
      <nav className="md:left-0 md:block md:fixed md:top-0 md:bottom-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-zinc-100	 flex flex-wrap items-center justify-between relative md:w-64 z-10 py-4 px-6">
        <div className="md:flex-col md:items-stretch md:min-h-full md:flex-nowrap px-0 flex flex-wrap items-center justify-between w-full mx-auto">
          {/* Toggler */}
          <button className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent" type="button" onClick={() => setCollapseShow("bg-zinc-100 m-2 py-3 px-6")}>
          <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>
          </button>
          {/* Brand */}
          <Link className="md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0" to="/dashboard">
              <img src={banner}></img>
          </Link>
          {isLoading
            ?
            <tr>
              <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                <div id="loading-button">
                  <svg role="status" className="w-4 mr-3 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                  </svg>
                </div>
              </th>
            </tr>
            :
            <a>FreeCoin: {user.coins}</a>
          }
          {/* Collapse */}
          <div
            className={
              "bg-zinc-100 md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-auto items-center flex-1 rounded " +
              collapseShow
            }
          >
            {/* Collapse header */}
            <div className="md:min-w-full md:hidden block pb-4 mb-4 bg-zinc-100">
              <div className="flex flex-wrap">
                <div className="w-6/12">
                  <Link
                    className="md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0"
                    to="/dashboard"
                  >
                    {isLoading
                      ?
                      <tr>
                        <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                          <div id="loading-button">
                            <svg role="status" className="w-4 mr-3 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                            </svg>
                          </div>
                        </th>
                      </tr>
                      :
                      <img src={banner}></img>
                    }
                  </Link>
                  {isLoading
                    ?
                    <tr>
                      <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                        <div id="loading-button">
                          <svg role="status" className="w-4 mr-3 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                          </svg>
                        </div>
                      </th>
                    </tr>
                    :
                    <a>FreeCoin: {user.coins}</a>
                  }
                </div>
                <div className="w-6/12 flex justify-end">
                  <button
                    type="button"
                    className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
                    onClick={() => setCollapseShow("hidden")}
                  >
                    <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="my-4 md:min-w-full" />
            {/* Navigation */}

            <ul className="md:flex-col md:min-w-full flex flex-col list-none text-zinc-900 bg-zinc-100">
              <li className="items-center">
                <Link className="text-xxs uppercase py-3 font-bold block " to="/dashboard">
                  <i className="fas fa-tv mr-2 text-sm "></i>{" "}
                  主頁面
                </Link>
              </li>

              <li className="items-center">
                <Link className="text-xxs uppercase py-3 font-bold block " to="/dashboard/create">
                  <i className="fas fa-tv mr-2 text-sm "></i>{" "}
                  創建伺服器
                </Link>
              </li>

              <li className="items-center">
                <Link className="text-xxs uppercase py-3 font-bold block " to="/dashboard/store">
                  <i className="fas fa-tv mr-2 text-sm "></i>{" "}
                  額外資源管理
                </Link>
              </li>

              <li className="items-center">
                <Link className="text-xxs uppercase py-3 font-bold block " to="/dashboard/freecoins">
                  <i className="fas fa-tv mr-2 text-sm "></i>{" "}
                  購買/兌換 FreeCoin
                </Link>
              </li>

              {isLoading
                ?
                <></>
                :
                pteroUser.attributes.root_admin
                  ?
                  <li className="items-center">
                    <Link className="text-xxs uppercase py-3 font-bold block " to="/dashboard/admin">
                      <i className="fas fa-tv mr-2 text-sm "></i>{" "}
                      管理員介面
                    </Link>
                  </li>
                  :
                  <></>
              }
              <li className="items-center">
                <a className="text-xxs uppercase py-3 font-bold block " href="/auth/logout">
                  <i className="fas fa-tv mr-2 text-sm "></i>{" "}
                  登出
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
