import React from 'react';
import { Link } from 'react-router-dom';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);


export default function CardServers() {
	const [isLoading, setIsLoading] = React.useState(true);
	const [servers, setServers] = React.useState(String);

	const navigate = useNavigate();

	React.useEffect(() => {
		fetch('/api/me', {
			credentials: 'include'
		})
			.then(response => response.json())
			.then(json => {
				setServers(json.servers);
				setIsLoading(false);
			});
	}, []);

	const convertTimestamp = (timestamp) => {
		const convert_timestamp = new Date(timestamp);
		const date = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(convert_timestamp);
		return date;
	};

	const renewQuestion = () => {
		MySwal.fire({
			icon: 'info',
			title: '到期時間?',
			confirmButtonText: '我懂了',
			text: '此機制是為防止用戶不使用而濫用伺服器資源。用戶需每月在此面板上點擊延長按鈕(在管理頁面中)，逾期未操作將導致伺服器被停權，並於三天後刪除。',
		})
	}

	return (
		<>
			<div className="relative flex flex-col min-w-0 break-words bg-white text-black w-full mb-6 shadow-lg rounded">
				<div className="rounded-t mb-0 px-4 py-3 border-0">
					<div className="flex flex-wrap items-center">
						<div className="relative w-full px-4 max-w-full flex-grow flex-1">
							<h3 className="font-semibold text-base text-blueGray-700">
								您擁有的伺服器列表
							</h3>
						</div>
					</div>
				</div>
				<div className="block w-full overflow-x-auto">
					{/* Projects table */}
					<table className="items-center w-full bg-transparent border-collapse">
						<thead>
							<tr>
								<th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
									伺服器名稱
								</th>
								<th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
									CPU
								</th>
								<th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
									記憶體
								</th>
								<th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
									硬碟
								</th>
								<th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
									到期時間 <button className="bg-orange-300 text-white active:bg-orange-500 font-bold uppercase text-xs px-2 py-1 rounded hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button" onClick={() => renewQuestion()}>?</button>
								</th>
								<th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
									管理
								</th>
							</tr>
						</thead>
						<tbody>
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
								servers.length > 0
								?
								servers.map((server) =>
									<tr>
										<th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
											{server.attributes.name.length > 15 ? server.attributes.name.slice(0, 12) + '...' : server.attributes.name}
										</th>
										<td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
											{server.attributes.limits.cpu}%
										</td>
										<td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
											{server.attributes.limits.memory}MiB
										</td>
										<td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
											{server.attributes.limits.disk}MiB
										</td>
										<td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
											{server.renewal_enabled
												?
												convertTimestamp(server.renew_by)
												:
												<a>不會到期</a>
											}
										</td>
										<td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
											<Link to={`/dashboard/manage/${server.attributes.id}`}>
												<button className="bg-orange-400 text-white active:bg-orange-500 font-bold uppercase text-xs px-2 py-1 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button">
													點我編輯/延長
												</button>
											</Link>
										</td>
									</tr>
								)
								:
								<div className="rounded-t mb-0 px-4 py-3 border-0">
									<div className="flex flex-wrap items-center">
										<div className="relative w-full px-4 max-w-full flex-grow flex-1">
											沒有伺服器。<button><a onClick={() => navigate('/dashboard/create')}>創建一個?</a></button>
										</div>
									</div>
								</div>
							}
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
}
