import Link from 'next/link';

export default function Footer() {
    return (
        <div className="h-16 w-full border border-t border-gray-700 border-opacity-10 mt-2 bg-white">
            <div className="max-w-screen-xl m-auto flex justify-between items-center h-full p-2">
                <p>
                    <Link href="/">
                        <a>
                            <span className="uppercase font-bold font-accent">STAKINGREWARDS</span>
                        </a>
                    </Link> ©2021 by
                    <Link href="https://polkaview.network/">
                        <a className="ml-1">Polkaview</a>
                    </Link>
                </p>

                <div className="">
                    <Link href="/disclaimer">
                        <a className="underline">
                            disclaimer
                            </a>
                    </Link>
                </div>
            </div>
        </div>
    );
}