import * as React from 'react';
import { Button, Checkbox, InputItem, TextareaItem, Toast, Icon } from 'antd-mobile';
import * as api from '../../services/integralWarning';
import * as qs from 'query-string';
import './styles.scss';

const { memo, forwardRef, useCallback, useReducer, useEffect, useState } = React;

const reg = /(^[0-9]{1,}$)|(^[0-9]{1,}[\.]{1}[0-9]{1,2}$)/;
// /^(([1-9]{0}\d*)|(0{1}))(\.\d{1,2})?$/;

const infoList = [
    { title: <span>时&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;间：</span>, key: 'time' },
    { title: <span>卡&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;号：</span>, key: 'cardNo' },
    { title: '手机号码：', key: 'phone' },
];

const normalTip = '请说明情况';
const improperTip = '如为顾客非正常消费，请反馈原因及处理结果';

interface StateInterface {
    normal: boolean;
    improper: boolean;
    integral: string;
    amount: string;
    result: string;
}

const initFormData: StateInterface = {
    normal: false,
    improper: false,
    integral: '',
    amount: '',
    result: '',
};

const reducer = (state: StateInterface, action: any) => {
    if (action) {
        return { ...state, ...action };
    } else {
        return state;
    }
};

const isSubmit = (formData: StateInterface) => {
    const { normal, improper, integral, amount, result } = formData;

    return !normal && !improper && integral === '' && amount === '' && result === '' ? true : false;
};

const getList = (data: any, isMore: boolean) => {
    if (data) {
        if (isMore) return data;
        const newData = data.length > 10 ? data.slice(0, 10) : data;
        return newData;
    } else {
        return [];
    }
};

const IntegralWarning = memo(
    forwardRef((props, ref) => {
        document.title = '积分异常预警';

        const params = qs.parse(window.location.search);
        const { msgid } = params;

        const [formData, dispatch] = useReducer(reducer, initFormData);
        const [dataSource, setDataSource] = useState({});
        const [isMore, setIsMore] = useState(false);
        const [submit, setSubmit] = useState(false);

        // 获取异常数据接口
        const getIntegralMessage = (params: any) => {
            Toast.loading('加载中....');
            api.getMessage(params, true)
                .then((rs: any) => {
                    Toast.hide();
                    const {
                        is_unusual,
                        result_content = '',
                        deduct_point = '',
                        deduct_amount = '',
                    } = rs['handleResult'];

                    const data = {
                        result: result_content,
                        amount: deduct_amount,
                        integral: deduct_point,
                    };
                    if (is_unusual === 'N') {
                        // 非正常消费
                        Object.assign(data, { normal: false, improper: true });
                    } else if (is_unusual === 'Y') {
                        // 正常消费
                        Object.assign(data, { normal: true, improper: false });
                    }
                    dispatch({ ...data });
                    setDataSource(rs || {});
                })
                .catch(() => {
                    Toast.hide();
                });
        };

        // 提交异常数据接口
        const submitIntegralMessage = (params: any) => {
            Toast.loading('提交中....');
            api.submitResult(params, true)
                .then((rs: any) => {
                    Toast.hide();
                    Toast.info('提交成功', 1);
                    setSubmit(true);
                })
                .catch(() => {
                    Toast.hide();
                });
        };

        // 初始化
        useEffect(() => {
            getIntegralMessage({ msgid });
        }, []);

        // 查看更多
        const handleMoreChange = useCallback(() => {
            setIsMore(!isMore);
        }, [isMore]);

        // 正常消费
        const handleNormalChange = useCallback(
            e => {
                const checked = e.target.checked;
                dispatch({ normal: checked, improper: false });
            },
            [dispatch]
        );

        // 非正常消费
        const handleImproperChange = useCallback(
            e => {
                const checked = e.target.checked;
                dispatch({ normal: false, improper: checked });
            },
            [dispatch]
        );

        // 积分
        const handleIntegralInput = useCallback(
            value => {
                if (reg.test(value) === false && value) {
                    const list = `${value}`.split('.') || [];
                    if (list[1].length === 0) dispatch({ integral: value });
                    Toast.info('请输入两位小数以内的正整数', 1);
                    return;
                }
                dispatch({ integral: value });
            },
            [dispatch]
        );

        // 金额
        const handleAmountInput = useCallback(
            value => {
                const number = Number(value);
                if (reg.test(value) === false && value) {
                    const list = `${value}`.split('.') || [];
                    if (list[1].length === 0) dispatch({ amount: value });
                    Toast.info('请输入两位小数以内的正整数', 1);
                    return;
                }
                dispatch({ amount: value });
            },
            [dispatch]
        );

        // 金额
        const handleResultInput = useCallback(
            value => {
                dispatch({ result: value });
            },
            [dispatch]
        );

        // 提交
        const handleSubmitChange = useCallback(() => {
            const { normal, improper, integral, amount, result } = formData;
            const { uniq, date_skey } = dataSource['handleResult'];

            if (!normal && !improper) {
                Toast.info('必须勾选正常消费或者非正常消费', 2);
                return;
            }

            if (improper && (integral === '' || !integral)) {
                Toast.info('请输入扣除积分数', 2);
                return;
            }

            if (improper && (amount === '' || !amount)) {
                Toast.info('请输入扣除金额数数', 2);
                return;
            }

            if (result === '' || result.replace(/(^\s*)|(\s*$)/g, '') === '') {
                Toast.info(improper ? '请输入处理结果说明' : '请输入说明情况', 2);
                return;
            }

            const submitData = {
                uniq: uniq,
                date_skey: date_skey,
                is_unusual: normal ? 'Y' : 'N',
                result_content: result,
                deduct_point: integral,
                deduct_amount: amount,
            };
            submitIntegralMessage({ msgid, postData: submitData });
        }, [formData, dataSource, msgid]);

        // 渲染
        return (
            <div className="integral-warning">
                <div className="text-top">
                    {/* 时间、卡号、手机号码 */}
                    <div className="info-text integral-radius">
                        {infoList.map((item: any, index: any) => {
                            return (
                                <div className="text" key={index}>
                                    <span>{item.title}</span>
                                    <span>{dataSource[item.key] || ''}</span>
                                </div>
                            );
                        })}
                        {dataSource['brief'] ? (
                            <div className="tip">{dataSource['brief']}</div>
                        ) : null}
                    </div>

                    {/* 列表 */}
                    <div className="list integral-radius">
                        {getList(dataSource['contentList'], isMore).map((item: any, index: any) => {
                            return (
                                <div className="text" key={index}>
                                    <span style={{ width: '65%' }}>{`时间：${
                                        item.time || ''
                                    }`}</span>
                                    <span
                                        style={{
                                            width: '35%',
                                            display: 'flex',
                                            // justifyContent: 'space-between',
                                        }}
                                    >
                                        <span>金额：</span>
                                        <span>{item.account || ''}</span>
                                    </span>
                                </div>
                            );
                        })}
                        {dataSource['contentList'] && dataSource['contentList'].length > 10 && (
                            <div className="more" onClick={handleMoreChange}>
                                {isMore ? '收起' : '查看更多'}
                                <Icon style={{ color: '#ccc' }} type={isMore ? 'up' : 'down'} />
                            </div>
                        )}
                    </div>
                    {/* 信息 */}
                    <div className="input-text integral-radius">
                        <h4>该记录是否为顾客正常消费</h4>

                        <div className="check-box-text">
                            <div className="check-box">
                                <span>正常消费</span>
                                <Checkbox checked={formData.normal} onChange={handleNormalChange} />
                            </div>
                            <div className="check-box">
                                <span>非正常消费</span>
                                <Checkbox
                                    checked={formData.improper}
                                    onChange={handleImproperChange}
                                />
                            </div>
                        </div>

                        <div
                            className="check-box-text"
                            style={{ display: formData.improper ? 'flex' : 'none' }}
                        >
                            <div className="check-box">
                                <span>扣除积分数：</span>
                                <InputItem
                                    placeholder="0.00"
                                    value={formData.integral}
                                    onChange={handleIntegralInput}
                                />
                            </div>
                            <div className="check-box">
                                <span>扣除金额数：</span>
                                <InputItem
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={handleAmountInput}
                                />
                            </div>
                        </div>
                        <div className="check_tip" style={{display: formData.improper ? 'block' : 'none' }}>请在卡系统手动扣除异常积分数及金额数</div>

                        <div className="text-area">
                            <span>处理结果：</span>
                            <TextareaItem
                                value={formData.result}
                                rows={5}
                                placeholder={
                                    formData.normal
                                        ? normalTip
                                        : formData.improper
                                        ? improperTip
                                        : normalTip
                                }
                                onChange={handleResultInput}
                            />
                        </div>
                    </div>
                </div>

                {/* 提交按钮 */}
                <div className={isSubmit(formData) || submit ? 'disabled-submit' : 'submit'}>
                    <Button
                        className="submit"
                        type="primary"
                        disabled={isSubmit(formData) || submit}
                        onClick={handleSubmitChange}
                    >
                        提交
                    </Button>
                </div>
            </div>
        );
    })
);

export default IntegralWarning;
