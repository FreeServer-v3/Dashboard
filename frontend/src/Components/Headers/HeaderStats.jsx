import React from 'react';
import { w3cwebsocket as W3CWebSocket } from 'websocket';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import 'sweetalert2/dist/sweetalert2.min.css';

const MySwal = withReactContent(Swal);

import CardStats from '../Cards/CardStats';
import { toast } from 'react-toastify';

export default function HeaderStats() {
	const [isLoading, setIsLoading] = React.useState(true);
	const [ram, setRam] = React.useState(String);
	const [cpu, setCPU] = React.useState(String);
	const [disk, setDisk] = React.useState(String);
	const [servers, setServers] = React.useState(String);
	const [isConnected, setIsConnected] = React.useState(false);

	React.useEffect(() => {
		const webSocketProtocol = window.location.protocol == 'https:' ? 'wss://' : 'ws://';
		const ws = new W3CWebSocket(`${webSocketProtocol}${window.location.host}/api/watch`);

		ws.onopen = function () {
			if (isConnected === true) return ws.close();
			console.log('Connected to websocket');
			setIsConnected(true);
		};
		ws.onclose = function () {
			console.log('Disconnected from websocket (Close Event)');

			// const wsDisconnected = new Promise(async (resolve, reject) => {
			// 	reject();
			// })
			// 	toast.promise(
			// 		wsDisconnected,
			// 		{
			// 			error: '我們與你斷連了，資訊將不會即時更新。重新整理應該可以解決問題。'
			// 		}
			// 	)
			
			MySwal.fire({
				icon: 'info',
				title: '提示',
				text: "我們與你斷連了，資訊將不會即時更新。重新整理應該可以解決問題。",
				confirmButtonText: "我知道了",
			  })
		};
		ws.addEventListener('message', function (event) {
			if (event.data.toString("utf8") === "This is a websocket message that check if you are alive. If you see this, are you gay?") return
			const data = JSON.parse(event.data);
			if (data.error) MySwal.fire({
				icon: 'error',
				title: '錯誤',
				text: data.error,
			});
			setRam(`${data.stats.used_ram}MB/${data.stats.total_ram}MB`);
			setCPU(`${data.stats.used_cpu}%/${data.stats.total_cpu}%`);
			setDisk(`${data.stats.used_disk}MB/${data.stats.total_disk}MB`);
			setServers(`${data.servers.length}`);
		});
		return () => {
			console.log('Disconnected from websocket (Page Leave)');
			ws.close();
		};
	}, []);

	React.useEffect(() => {
		fetch('/api/me', {
			credentials: 'include'
		})
			.then(response => response.json())
			.then(json => {
				setRam(`${json.stats.used_ram}MiB/${json.stats.total_ram}MiB`);
				setCPU(`${json.stats.used_cpu}%/${json.stats.total_cpu}%`);
				setDisk(`${json.stats.used_disk}MiB/${json.stats.total_disk}MiB`);
				setServers(`${json.servers.length}個/無上限`);
				setIsLoading(false)
			});
	}, []);

	return (
		<>
			{/* Header */}
			<div className="relative bg-lightBlue-600 md:pt-32 pb-32 pt-12 bg-white">
				<div className="px-4 md:px-10 mx-auto w-full">
					<div>
						{/* Card stats */}
						<div className="flex flex-wrap">
							<div className="w-full lg:w-6/12 xl:w-3/12 px-4">
								<CardStats
									statSubtitle="CPU"
									statTitle={cpu}
									isLoading={isLoading}
								/>
							</div>
							<div className="w-full lg:w-6/12 xl:w-3/12 px-4">
								<CardStats
									statSubtitle="記憶體"
									statTitle={ram}
									isLoading={isLoading}
								/>
							</div>
							<div className="w-full lg:w-6/12 xl:w-3/12 px-4">
								<CardStats
									statSubtitle="硬碟"
									statTitle={disk}
									isLoading={isLoading}
								/>
							</div>
							<div className="w-full lg:w-6/12 xl:w-3/12 px-4">
								<CardStats
									statSubtitle="已創建伺服器數量"
									statTitle={servers}
									isLoading={isLoading}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
