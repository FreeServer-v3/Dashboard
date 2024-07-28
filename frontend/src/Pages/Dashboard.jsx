import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import 'sweetalert2/dist/sweetalert2.min.css';

const MySwal = withReactContent(Swal);

import CardServers from '../Components/Cards/CardServers';
import CardInfo from '../Components/Cards/CardInfo';

export default function Dashboard() {
	const [searchParams, setSearchParams] = useSearchParams();
	const generated_password = searchParams.get("generatedpassword")
	if (!generated_password) {
	} else {
		MySwal.fire({
			icon: 'info',
			title: '歡迎!',
			text: `歡迎來到 FreeServer 面板。 由於此帳戶為新註冊，我們已為您生成新的面板密碼，請使用此密碼登入控制面板。您也可以在稍後重設此密碼。\n密碼: ${generated_password} `,
		}).then(() => {
			setSearchParams('')
		})
	}
	return (
		<>
			<div className="flex flex-wrap mt-4">
				<div className="w-full xl:w-8/12 mb-12 xl:mb-0 px-4">
					<CardServers />
				</div>
				<div className="w-full xl:w-4/12 px-4">
					<CardInfo />
				</div>
			</div>
		</>
	);
}
