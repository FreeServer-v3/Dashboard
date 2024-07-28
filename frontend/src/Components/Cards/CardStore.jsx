import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import 'sweetalert2/dist/sweetalert2.min.css';
const MySwal = withReactContent(Swal);
const buttonStyle = `
  text-sm 
  px-5 
  py-2.5 
  font-medium 
  focus:outline-none 
  transition-all 
  duration-300
  inline-flex 
  items-center 
  border 
  rounded 
  cursor-pointer
`;
const activeButtonStyle = `
  text-white 
  bg-orange-400 
  hover:bg-orange-600 
  focus:ring-4 
  focus:outline-none 
  focus:ring-orange-300 
  dark:focus:ring-orange-800
`;
const inactiveButtonStyle = `
  text-orange-600 
  hover:text-white 
  border-orange-500 
  hover:bg-orange-600 
  focus:ring-4 
  focus:ring-orange-300 
  dark:border-orange-400 
  dark:text-orange-500 
  dark:hover:text-white 
  dark:hover:bg-orange-600 
  dark:focus:ring-orange-800
`;

import { toast } from 'react-toastify'
export default function CardStore() {
	const [isLoading, setIsLoading] = React.useState(true);
	const [ramPrice, setRamPrice] = React.useState(String);
	const [cpuPrice, setCpuPrice] = React.useState(String);
	const [diskPrice, setDiskPrice] = React.useState(String);
	const [userCPU, setUserCPU] = React.useState()
	const [userRam, setUserRam] =  React.useState()
	const [userDisk, setUserDisk] = React.useState()
	const [dayMultiply, setDayMultiply] = React.useState(String);
	const [weekMultiply, setweekMultiply] = React.useState(String);
	const [cycleT, setCycleT] = React.useState(String);
	const [freecoinPerT, setFreeCoinPerT] = React.useState();
	const [resExpDate, setResExpDate] = React.useState();
	const [isExpired, setIsExpired] = React.useState(false);

	const navigate = useNavigate();

	function checkInt(num){
		return (typeof num === 'number' && Number.isInteger(num) && num%1==0 && num >= 0)
	}

	React.useEffect(() => {
		const intervalId = setInterval(() => {
			const newCPU = document.getElementById('cpu_amount').value
			const newRam = document.getElementById('ram_amount').value
			const newDisk = document.getElementById('disk_amount').value
			if ((!checkInt(newCPU*1)) || (!checkInt(newRam*1)) || (!checkInt(newDisk*1))) {
				setFreeCoinPerT("ERROR")
			} else {
				let cycleMultiplier = 1;
				if (cycleT == "daily") {
					cycleMultiplier = parseInt(dayMultiply)/25;
				} else if (cycleT == "weekly") {
					cycleMultiplier = parseInt(weekMultiply)/4;
				} else if (cycleT == "monthly") {
					cycleMultiplier = 1;
				}
				const priceCPU = parseInt(cpuPrice);
				const priceRam = parseInt(ramPrice);
				const priceDisk = parseInt(diskPrice);
				const subtotal = Math.ceil((newCPU*priceCPU + newRam*priceRam + newDisk*priceDisk)*cycleMultiplier);
				setFreeCoinPerT(subtotal);
			}
		}, 100);
	  
		return () => clearInterval(intervalId);
	  }, [cpuPrice, ramPrice, diskPrice, cycleT]);
	  

	React.useEffect(() => {
		fetch('/api/store', {
			credentials: 'include'
		})
			.then(response => response.json())
			.then(json => {
				setRamPrice(json.ram_price);
				setCpuPrice(json.cpu_price);
				setDiskPrice(json.disk_price);
				setUserCPU(json.user_cpu/100);
				setUserRam(json.user_ram/1024);
				setUserDisk(json.user_disk/1024);
				setweekMultiply(json.week_multiplier)
				setDayMultiply(json.day_multiplier)
			})
		.then(
			fetch('/api/store/cycle', {
				credentials: 'include'
			})
				.then(response => response.json())
				.then(json => {
					setCycleT(json.cycle);
					setResExpDate(json.exp);
					let now = new Date();
					let newExpiryDate = new Date(now);
					if ((json.exp != 0) && (newExpiryDate > json.exp)) {
						setIsExpired(true)
					} else {
						setIsExpired(false)
					}
					setFreeCoinPerT(0);
					setIsLoading(false);
				})
		)
	},[]);

	function howToCalculatePopup() {
		MySwal.fire({
			icon: 'info',
			title: '怎麼運作的？',
			text: '每項資源乘以週期的價格後，全部相加後無條件進位至整數。資源於每次週期開始時扣款，如果沒有足夠的 FreeCoin 或 伺服器超過配置，所有伺服器資源將會被調整至0並強制關機。',
			confirmButtonText: '我懂了'
		})
	}

	const updateAdditionalResources = () => {
		MySwal.fire({
			title: '變更額外資源',
			text: `${freecoinPerT === 'ERROR' ? "你輸入的數字有誤，請檢查後再變更。" : `我們會立刻收取 ${freecoinPerT} 個 FreeCoin，直至下個週期(${cycleT === "weekly"? "下周" : cycleT === "monthly" ? "下個月" : "明天"})再收取下次費用。`}`,
			icon: 'info',
			showCancelButton: true,
			confirmButtonColor: '#3d3',
			cancelButtonColor: '#ccc',
			confirmButtonText: '付款並變更',
			cancelButtonText: '等等再說',
		}).then((result) => {
			if (result.isConfirmed) {
				const updateAdditionalResourcesPromise = new Promise(async (resolve, reject) => {
					const cpuspec = document.getElementById('cpu_amount').value
					const ramspec = document.getElementById('ram_amount').value
					const diskspec = document.getElementById('disk_amount').value
					fetch(`/api/store/update`, {
						method: 'PUT',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							cpu: cpuspec,
							ram: ramspec,
							disk: diskspec,
							cycle: cycleT,
						})
					})
						.then(response => response.json())
						.then(json => {
							if (json.success) {
								resolve();
								MySwal.fire({
									icon: 'success',
									title: '更新成功',
									text: `將在${cycleT === "weekly"? "下週" : cycleT === "monthly" ? "下個月" : "明天"}被再次收取費用。`,
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
					updateAdditionalResourcesPromise,
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

	const convertTimestamp = (timestamp) => {
		const convert_timestamp = new Date(timestamp);
		const date = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(convert_timestamp);
		return date;
	};

	return (
		<>
		    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
            	<div className="rounded-t mb-0 px-4 py-3 border-0">
					<div className="flex flex-wrap items-center">
						<div className="relative w-full px-4 max-w-full flex-grow flex-1">
							<h3 className="font-semibold text-base text-blueGray-700">
            	                最終週期費用 <button className="bg-orange-300 text-white active:bg-orange-500 font-bold uppercase text-xs px-2 py-1 rounded hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button" onClick={() => howToCalculatePopup()}>?</button>
							</h3>
						</div>
					</div>
				<br/>
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
						<div className='text-xl mr-4'>
            				{freecoinPerT === 'ERROR' ? "輸入數字有誤" : ` ${freecoinPerT} FreeCoin/` + (cycleT === "weekly"? "每週" : cycleT === "monthly" ? "每月" : "每日")}
            			</div>
						<div className={isExpired ? "text-red-500 mr-4" : "text-black text-base mr-4"}>
							{resExpDate === 0 ? "" : `下次收款時間:${convertTimestamp(resExpDate)} ${isExpired ? "(上次收款失敗，因此資源已歸零。)" : ""}`}
						</div>
					</>
				}
				<br/>
				</div>
			</div>
			
		    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
            	<div className="rounded-t mb-0 px-4 py-3 border-0">
					<div className="flex flex-wrap items-center">
						<div className="relative w-full px-4 max-w-full flex-grow flex-1">
							<h3 className="font-semibold text-base text-blueGray-700">
								更改週期...
							</h3>
						</div>
					</div>
				<br/>
				<button
				onClick={() => setCycleT("daily")}
				type="button"
				className={`
					${buttonStyle} 
					${cycleT === "daily" ? activeButtonStyle : inactiveButtonStyle}
				`}
				>
				每日
				</button>
				<button
				onClick={() => setCycleT("weekly")}
				type="button"
				className={`
					${buttonStyle} 
					${cycleT === "weekly" ? activeButtonStyle : inactiveButtonStyle}
				`}
				>
				每周
				</button>
				<button
				onClick={() => setCycleT("monthly")}
				type="button"
				className={`
					${buttonStyle} 
					${cycleT === "monthly" ? activeButtonStyle : inactiveButtonStyle}
				`}
				>
				每月
				</button>
				</div>
        	</div>
			<div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
				<div className="rounded-t mb-0 px-4 py-3 border-0">
					<div className="flex flex-wrap items-center">
						<div className="relative w-full px-4 max-w-full flex-grow flex-1">
							<h3 className="font-semibold text-base text-blueGray-700">
                                調整額外資源
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
									<a>100% CPU: {cycleT === "weekly"? (parseInt(cpuPrice)*parseInt(weekMultiply)/4).toString() + " FreeCoin / 週" : cycleT === "monthly" ? cpuPrice + " FreeCoin / 月" : (parseInt(cpuPrice)*parseInt(dayMultiply)/25).toString() + " FreeCoin / 日"}</a>
									<br></br>
									<br></br>
									<div className="relative z-0 w-full mb-6 group">
										<input type="text" defaultValue={userCPU} id="cpu_amount" name="cpu_amount" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-orange-500 peer" placeholder=" " required />
										<label htmlFor="cpu_amount" className="peer-focus:font-medium absolute text-sm text-black duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-orange-500 peer-focus:dark:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                            請填入整數 (x100%)
										</label>
									</div>
									<br></br>
									<a>1 GiB (1024MiB) 記憶體: {cycleT === "weekly"? (parseInt(ramPrice)*parseInt(weekMultiply)/4).toString() + " FreeCoin / 週" : cycleT === "monthly" ? ramPrice + " FreeCoin / 月" : (parseInt(ramPrice)*parseInt(dayMultiply)/25).toString() + " FreeCoin / 日"}</a>
									<br></br>
									<br></br>
									<div className="relative z-0 w-full mb-6 group">
										<input type="text" defaultValue={userRam} id="ram_amount" name="ram_amount" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-orange-500 peer" placeholder=" " required />
										<label htmlFor="ram_amount" className="peer-focus:font-medium absolute text-sm text-black duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-orange-500 peer-focus:dark:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                            請填入整數 (x1GiB)
										</label>
									</div>
									<br></br>
									<a>1 GiB (1024MiB) 儲存空間: {cycleT === "weekly"? (parseInt(diskPrice)*parseInt(weekMultiply)/4).toString() + " FreeCoin / 週" : cycleT === "monthly" ? diskPrice + " FreeCoin / 月" : (parseInt(diskPrice)*parseInt(dayMultiply)/25).toString() + " FreeCoin / 日"}</a>
									<br></br>
									<br></br>
									<div className="relative z-0 w-full mb-6 group">
										<input type="text" defaultValue={userDisk} id="disk_amount" name="disk_amount" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-orange-500 peer" placeholder=" " required />
										<label htmlFor="disk_amount" className="peer-focus:font-medium absolute text-sm text-black duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-orange-500 peer-focus:dark:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                            請填入整數 (x1GiB)
										</label>
									</div>
									<br></br>
									<button onClick={() => updateAdditionalResources()} className="text-white bg-orange-400 hover:bg-orange-600 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center">
										更改額外資源
		        					</button>
								</>
							}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
