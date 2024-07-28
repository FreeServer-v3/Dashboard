import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import 'sweetalert2/dist/sweetalert2.min.css';

const MySwal = withReactContent(Swal);

import { toast } from 'react-toastify'

export default function CardManageServer() {
	const [isLoading, setIsLoading] = React.useState(true);
	const [server, setServer] = React.useState(String);
	const [pterodactylUrl, setPterodactylUrl] = React.useState(String);
	const [renewal, setRenewal] = React.useState(String);
	const [renewalCost, setRenewalCost] = React.useState(String);
	const [renewalEnabled, setRenewalEnabled] = React.useState(String);

	const params = useParams();
	const navigate = useNavigate();

	React.useEffect(() => {
		fetch(`/api/server/get/${params.id}`, {
			credentials: 'include'
		})
			.then(response => response.json())
			.then(json => {
				if (json.error) return MySwal.fire({
					icon: 'error',
					title: '錯誤',
					text: json.error,
				}).then(() => {
					navigate('/dashboard');
				});
				setServer(json.server);
				fetch('/api/dashboard-info', {
					credentials: 'include'
				})
					.then(response => response.json())
					.then(json => {
						if (json.error) return MySwal.fire({
							icon: 'error',
							title: 'Error',
							text: json.error,
						});
						setPterodactylUrl(json.pterodactyl_url);
						fetch(`/api/renew/get/${params.id}`, {
							credentials: 'include'
						})
							.then(response => response.json())
							.then(json => {
								if (json.error) return MySwal.fire({
									icon: 'error',
									title: '錯誤',
									text: json.error,
								});
								const timestamp = new Date(json.renewal.renew_by);
								const date = new Intl.DateTimeFormat('en-UK', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(timestamp);
								setRenewal(date);
								setRenewalCost(json.renewal.renew_cost);
								setRenewalEnabled(json.renewal.renewal_enabled);
								setIsLoading(false);
							});
					});
			});
	}, []);

	const updateSpecs = () => {
		MySwal.fire({
			title: '配置更新',
			text: `更新可能會造成伺服器卡死、崩潰，請確保已關機並儲存所有檔案後再更改配置。`,
			icon: 'info',
			showCancelButton: true,
			confirmButtonColor: '#3d3',
			cancelButtonColor: '#ccc',
			confirmButtonText: '更新',
			cancelButtonText: '等等再說',
		}).then((result) => {
			if (result.isConfirmed) {
				const updateSpecsPrmoise = new Promise(async (resolve, reject) => {
					const newcpuspec = document.getElementById('cpu').value
					const newramspec = document.getElementById('ram').value
					const newdiskspec = document.getElementById('disk').value
					fetch(`/api/server/edit/${params.id}`, {
						method: 'PATCH',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							cpu: newcpuspec,
							ram: newramspec,
							disk: newdiskspec
						})
					})
						.then(response => response.json())
						.then(json => {
							if (json.success) {
								resolve();
								MySwal.fire({
									icon: 'success',
									title: '更新成功',
									text: '伺服器配置已更新，可能需要重新啟動伺服器。',
									confirmButtonText: '好',
								}).then(() => {
									return navigate('./');
								});
							}
							if (json.error) {
								reject(json.error);
								MySwal.fire({
									icon: 'error',
									title: '更新失敗',
									text: json.error,
								})
							}
						})
					})
				toast.promise(
					updateSpecsPrmoise,
					{
						pending: '正在更新配置...',
						success: '伺服器配置已更新!',
						error: {
							render({ data }) {
								return <a>{data}</a>
							}
						}
					}
				)
				}
			})
	}

	const redirect = () => {
		window.open(`${pterodactylUrl}/server/${server.attributes.identifier}`);
	};

	const renewServer = () => {
		MySwal.fire({
			title: '',
			text: `點擊"延長到期日"按鈕後，到期時間將被延至今日+30天後。(此行為不用花費 FreeCoin)`,
			icon: 'info',
			showCancelButton: false,
			confirmButtonColor: '#3a3',
			confirmButtonText: '延長到期日'
		}).then((result) => {
			if (result.isConfirmed) {
				fetch(`/api/renew/${params.id}`, {
					method: 'post',
					credentials: 'include'
				})
					.then(response => response.json())
					.then(json => {
						if (json.error) return MySwal.fire({
							icon: 'error',
							title: '發生了點錯誤...',
							text: json.error,
						});
						if (json.success) {
							fetch(`/api/renew/get/${params.id}`, {
								credentials: 'include'
							})
								.then(response => response.json())
								.then(json => {
									if (json.error) return MySwal.fire({
										icon: 'error',
										title: '發生了點錯誤...',
										text: json.error,
									});
									const timestamp = new Date(json.renewal.renew_by);
									const date = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(timestamp);
									setRenewal(date);
									setRenewalCost(json.renewal.renew_cost);
									setRenewalEnabled(json.renewal.renewal_enabled);
								});
								
							return MySwal.fire({
								icon: 'success',
								title: '續約完成',
								text: "您將可以在未來30天內繼續使用伺服器。",
							});
						}
					});
			}
		});
	};


	// --TODO--
	const forceReinstallServer = () => {
		MySwal.fire({
			title: '要強制重新安裝嗎？',
			text: '將停止此伺服器所有動作，並重新安裝。檔案將不會被刪除，但可能會被覆蓋。',
			icon: 'info',
			showCancelButton: true,
			confirmButtonColor: '#ff0',
			cancelButtonColor: '#ccc',
			confirmButtonText: '強制重裝伺服器',
			cancelButtonText: '算了',
		}).then((result) => {
			if (result.isConfirmed) {
				const reinstallServerPromise = new Promise(async (resolve, reject) => {
					fetch(`/api/server/forcereinstall/${params.id}`), {
						method: 'post',
						credentials: 'include'
					}
				})
			}
		})
	}

	const deleteServer = () => {
		MySwal.fire({
			title: '你確定要刪除嗎?',
			text: `刪掉後就沒囉!`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#d33',
			cancelButtonColor: '#ccc',
			confirmButtonText: '刪除伺服器',
			cancelButtonText: '算了',
		}).then((result) => {
			if (result.isConfirmed) {
				const deleteServerPromise = new Promise(async (resolve, reject) => {
					fetch(`/api/server/delete/${params.id}`, {
						method: 'delete',
						credentials: 'include'
					})
						.then(response => response.json())
						.then(json => {
							if (json.error) {
								reject(json.error)
								return MySwal.fire({
									icon: 'error',
									title: '錯誤',
									text: json.error,
								});
							}
							if (json.success) {
								resolve()
								return MySwal.fire({
									icon: 'success',
									title: '成功刪除',
									text: '伺服器已被刪除。',
								}).then(() => {
									return navigate('/dashboard');
								});
							}
						});
				})
				toast.promise(
					deleteServerPromise,
					{
						pending: '正在刪除伺服器...',
						success: '伺服器刪除成功!',
						error: {
							render({ data }) {
								return <a>{data}</a>
							}
						}
					}
				)
			}
		});
	};

	return (
		<>
		<br></br>
			<div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
				<div className="rounded-t mb-0 px-4 py-3 border-0">
					<div className="flex flex-wrap items-center">
						<div className="relative w-full px-4 max-w-full flex-grow flex-1">
							<h3 className="font-semibold text-base text-blueGray-700">
								伺服器資訊
							</h3>
						</div>
					</div>
				</div>
				<div className="rounded-t mb-0 px-4 py-3 border-0">
					<div className="flex flex-wrap items-center">
						<div className="relative w-full px-4 max-w-full flex-grow flex-1">
							{isLoading ?
								<th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
									<div id="loading-button">
										<svg role="status" className="w-4 mr-3 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
											<path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
										</svg>
									</div>
								</th>
								:
								<>
									<a>伺服器名稱: {server.attributes.name}</a>
									<br></br>
									<br></br>
									{/* <a>CPU: {server.attributes.limits.cpu} %</a><br></br>
									<a>記憶體: {server.attributes.limits.memory} MiB</a><br></br>
									<a>儲存空間: {server.attributes.limits.disk} MiB</a><br></br> */}
									<div className="relative z-0 w-full mb-6 group">
										<input defaultValue={server.attributes.limits.cpu} type="text" name="cpu" id="cpu" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-orange-400 peer" placeholder=" " required />
										<label htmlFor="cpu" className="peer-focus:font-medium absolute text-sm text-black duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-orange-500 peer-focus:dark:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
											CPU (%)
										</label>
									</div>
									<div className="relative z-0 w-full mb-6 group">
										<input defaultValue={server.attributes.limits.memory} type="text" name="ram" id="ram" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-orange-400 peer" placeholder=" " required />
										<label htmlFor="ram" className="peer-focus:font-medium absolute text-sm text-black duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-orange-500 peer-focus:dark:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
											記憶體 (MiB)
										</label>
									</div>
									<div className="relative z-0 w-full mb-6 group">
										<input defaultValue={server.attributes.limits.disk} type="text" name="disk" id="disk" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-orange-400 peer" placeholder=" " required />
										<label htmlFor="disk" className="peer-focus:font-medium absolute text-sm text-black duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-orange-500 peer-focus:dark:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
											硬碟 (MiB)
										</label>
									</div>
									<button onClick={updateSpecs} className="text-white bg-orange-400 hover:bg-orange-600 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center">
										更新伺服器配置
									</button>
									<br></br>
									<br></br>
									{renewalEnabled
										?
										<>
											<a>下次到期日: {renewal}</a><br></br>
											{/* <a>Renewal Cost: {renewalCost}</a> */}
										</>
										:
										<></>
									}
									<br></br>
									<button onClick={redirect} type="button" className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-600 dark:focus:ring-blue-800">進入控制面板</button>
									{renewalEnabled
										?
										<button onClick={renewServer} type="button" className="text-green-700 hover:text-white border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 dark:border-green-500 dark:text-green-500 dark:hover:text-white dark:hover:bg-green-600 dark:focus:ring-green-800">延長到期時間</button>
										:
										<></>
									}
									{/* TODO */}
									{/* <button onClick={forceReinstallServer} type="button" className="text-yellow-700 hover:text-white border border-yellow-700 hover:bg-yellow-800 focus:ring-4 focus:outline-none focus:ring-yellow-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 dark:border-yellow-500 dark:text-yellow-500 dark:hover:text-white dark:hover:bg-yellow-600 dark:focus:ring-yellow-900">強制重新安裝</button> */}
									<button onClick={deleteServer} type="button" className="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">刪除伺服器</button>
								</>
							}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
