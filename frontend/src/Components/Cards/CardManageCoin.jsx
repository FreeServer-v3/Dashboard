import React from 'react';
import Swal from 'sweetalert2';
import { useNavigate, useParams } from 'react-router-dom';
import withReactContent from 'sweetalert2-react-content';
import 'sweetalert2/dist/sweetalert2.min.css';
const MySwal = withReactContent(Swal);

export default function CardManageCoin() {
	const navigate = useNavigate();

	function redeem() {
		const coupon_code = document.getElementById('coupon_code').value;
        return new Promise((resolve, reject) => {
            fetch('/api/redeem', {
                body: JSON.stringify({
                    coupon: coupon_code,
                }),
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            })
			.then(response => response.json())
			.then(json => {
				if (json.success) return MySwal.fire({
					icon: 'success',
					title: '兌換成功',
					text: `已兌換 ${json.coins} FreeCoin`,
				}).then(() => {
					return navigate('./');
				});
				if (!json.success) MySwal.fire({
					icon: 'error',
					title: '錯誤',
					text: "沒有這個禮物卡。",
				});
			});
        });
	}

    function goNafStore(){
        window.open('https://nafstore.net/p/freeserver-freecoin-giftcard/', '_blank');
    }

    return (
        <>
        <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
            <div className="rounded-t mb-0 px-4 py-3 border-0">
                <div className="flex flex-wrap items-center">
                    <div className="relative w-full px-4 max-w-full flex-grow flex-1">
                        <h3 className="font-semibold text-base text-blueGray-700">
                            購買禮物卡
                        </h3>
                    </div>
                </div>
            </div>
			<div className="rounded-t mb-0 px-4 py-3 border-0">
				<div className="flex flex-wrap items-center">
					<div className="relative w-full px-4 max-w-full flex-grow flex-1">
                <button onClick={() => goNafStore()} className="text-white bg-orange-400 hover:bg-orange-600 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center">
		            前往 NAF商城 購買禮物卡↗
		        </button>
                </div>
            </div>
            </div>
        </div>

        <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
            <div className="rounded-t mb-0 px-4 py-3 border-0">
                <div className="flex flex-wrap items-center">
                    <div className="relative w-full px-4 max-w-full flex-grow flex-1">
                        <h3 className="font-semibold text-base text-blueGray-700">
                            管理 FreeCoin
                        </h3>
                    </div>
                </div>
            </div>
			<div className="rounded-t mb-0 px-4 py-3 border-0">
				<div className="flex flex-wrap items-center">
					<div className="relative w-full px-4 max-w-full flex-grow flex-1">
							<>
								<a>兌換禮物卡</a>
                                <br></br>
								<br></br>
								<div className="relative z-0 w-full mb-6 group">
									<input type="text" id="coupon_code" name="coupon_code" className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-orange-500 peer" placeholder=" " required />
									<label htmlFor="coupon_code" className="peer-focus:font-medium absolute text-sm text-black duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-orange-500 peer-focus:dark:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                        禮物卡號碼
									</label>
								</div>
								<button onClick={() => redeem()} type="button" className="text-orange-600 hover:text-white border border-orange-500 hover:bg-orange-600 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 dark:border-orange-400 dark:text-orange-500 dark:hover:text-white dark:hover:bg-orange-600 dark:focus:ring-orange-800">兌換</button>
					        </>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}