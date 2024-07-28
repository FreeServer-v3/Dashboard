// THIS FILE IS ABANDONED
// (MOVED TO > CARDSTORE.JSX)



import React from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import 'sweetalert2/dist/sweetalert2.min.css';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

const MySwal = withReactContent(Swal);

export default function CardStoreRescalc() {
    const freecoinPerT = 0;
    const [alignment, setAlignment] = React.useState('daily');

    const handleAlignment = (event, newAlignment) => {
        setAlignment(newAlignment);
        changePaygTime(newAlignment);
    };
    
    function changePaygTime(time) {
        switch (time)
        {
            case "daily":
            case "weekly":
            case "monthly":
        }
    }

    function calcRate(){

    }

    return (
    <>
        <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
            <div className="rounded-t mb-0 px-4 py-3 border-0">
				<div className="flex flex-wrap items-center">
					<div className="relative w-full px-4 max-w-full flex-grow flex-1">
						<h3 className="font-semibold text-base text-blueGray-700">
                            週期及計費方式
						</h3>
					</div>
				</div>

			<div className='text-xl'>
            {freecoinPerT} FreeCoin/{alignment === "weekly"? "每週" : alignment === "monthly" ? "每月" : "每日"}
            </div>

            <ToggleButtonGroup
                color='primary'
                value={alignment}
                exclusive
                onChange={handleAlignment}
                aria-label="text alignment"
            >
                <ToggleButton value="daily" aria-label="left aligned">
                    每日
                </ToggleButton>

                <ToggleButton value="weekly" aria-label="centered">
                    每周
                </ToggleButton>

                <ToggleButton value="monthly" aria-label="right aligned">
                    每月
                </ToggleButton>
                
            </ToggleButtonGroup>
            </div>
        </div>
    </>
    )
}